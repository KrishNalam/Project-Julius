const { google } = require('googleapis')
const Task = require('../models/Task')
const Event = require('../models/Event')
const PrepSlot = require('../models/PrepSlot')

const CALENDAR_NAME = 'Project Julius'
const TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone

const isConfigured = () =>
    Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)

const createOAuthClient = () =>
    new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI ||
            'http://localhost:3001/api/google/callback'
    )

// OAuth client bound to a user's stored tokens; persists refreshed tokens
const clientForUser = (user) => {
    const client = createOAuthClient()
    client.setCredentials({
        access_token: user.google.accessToken,
        refresh_token: user.google.refreshToken,
        expiry_date: user.google.expiryDate,
    })
    client.on('tokens', async (tokens) => {
        if (tokens.access_token) user.google.accessToken = tokens.access_token
        if (tokens.refresh_token) user.google.refreshToken = tokens.refresh_token
        if (tokens.expiry_date) user.google.expiryDate = tokens.expiry_date
        await user.save().catch(() => {})
    })
    return client
}

const calendarApi = (user) =>
    google.calendar({ version: 'v3', auth: clientForUser(user) })

// Find or create the dedicated "Project Julius" calendar, caching its id
const ensureCalendar = async (user) => {
    const api = calendarApi(user)

    if (user.google.calendarId) {
        try {
            await api.calendars.get({ calendarId: user.google.calendarId })
            return user.google.calendarId
        } catch {
            // Calendar was deleted on Google's side — fall through and recreate
        }
    }

    const { data: list } = await api.calendarList.list()
    const existing = list.items?.find((c) => c.summary === CALENDAR_NAME)

    const calendarId =
        existing?.id ??
        (await api.calendars.insert({ requestBody: { summary: CALENDAR_NAME } }))
            .data.id

    user.google.calendarId = calendarId
    await user.save()
    return calendarId
}

// Next day as 'YYYY-MM-DD' — all-day events end on the following date
const nextDay = (dateKey) => {
    const [y, m, d] = dateKey.split('-').map(Number)
    const date = new Date(y, m - 1, d + 1)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
        date.getDate()
    ).padStart(2, '0')}`
}

const toGcalEvent = (item, kind) => {
    const isTask = kind === 'task'
    return {
        summary: `${isTask && item.completed ? '✅ ' : ''}${item.title}`,
        description: isTask
            ? item.description || ''
            : `${item.context}\n\nImported from: ${item.source}`,
        start: { date: item.dueDate },
        end: { date: nextDay(item.dueDate) },
    }
}

// Timed event body for an auto-scheduled prep slot
const toGcalSlotEvent = (slot) => ({
    summary: slot.title,
    description: 'Auto-scheduled prep time (Project Julius)',
    start: { dateTime: `${slot.date}T${slot.startTime}:00`, timeZone: TIMEZONE },
    end: { dateTime: `${slot.date}T${slot.endTime}:00`, timeZone: TIMEZONE },
})

// Insert or update one item on Google Calendar. Persists gcalEventId.
const upsertRaw = async (user, item, requestBody) => {
    const api = calendarApi(user)
    const calendarId = await ensureCalendar(user)

    if (item.gcalEventId) {
        try {
            await api.events.update({
                calendarId,
                eventId: item.gcalEventId,
                requestBody,
            })
            return
        } catch {
            // Event was deleted on Google's side — recreate below
        }
    }

    const { data } = await api.events.insert({ calendarId, requestBody })
    item.gcalEventId = data.id
    await item.save()
}

const upsertItem = (user, item, kind) =>
    upsertRaw(user, item, toGcalEvent(item, kind))

const upsertSlot = (user, slot) => upsertRaw(user, slot, toGcalSlotEvent(slot))

const deleteItem = async (user, gcalEventId) => {
    if (!gcalEventId || !user.google.calendarId) return
    const api = calendarApi(user)
    try {
        await api.events.delete({
            calendarId: user.google.calendarId,
            eventId: gcalEventId,
        })
    } catch {
        // Already gone — nothing to do
    }
}

// Push every dated task, document event, and prep slot for this user
const syncAll = async (user) => {
    const [tasks, events, slots] = await Promise.all([
        Task.find({ userId: user._id, dueDate: { $ne: '' } }),
        Event.find({ userId: user._id }),
        PrepSlot.find({ userId: user._id }),
    ])

    let synced = 0
    for (const task of tasks) {
        await upsertItem(user, task, 'task')
        synced++
    }
    for (const event of events) {
        await upsertItem(user, event, 'event')
        synced++
    }
    for (const slot of slots) {
        await upsertSlot(user, slot)
        synced++
    }
    return synced
}

// Best-effort wrapper: sync failures must never break the CRUD request
const trySync = async (user, fn) => {
    if (!user?.google?.connected || !isConfigured()) return
    try {
        await fn()
    } catch (err) {
        console.error('Google Calendar sync failed:', err.message)
    }
}

module.exports = {
    isConfigured,
    createOAuthClient,
    ensureCalendar,
    upsertItem,
    upsertSlot,
    deleteItem,
    syncAll,
    trySync,
    CALENDAR_NAME,
}
