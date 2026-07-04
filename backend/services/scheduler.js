const Task = require('../models/Task')
const Event = require('../models/Event')
const Rule = require('../models/Rule')
const PrepSlot = require('../models/PrepSlot')
const gcal = require('./googleCalendar')

// Defaults, overridable via working-hours / daily-cap rules
const DEFAULT_WORK_START = 9 * 60 // 09:00
const DEFAULT_WORK_END = 21 * 60 // 21:00
const DEFAULT_DAILY_CAP = 4 * 60 // minutes of prep per day
const BLOCK_MINUTES = 60 // one prep block
const LOOKBACK_DAYS = 14 // how far before the due date we'll schedule

const toMinutes = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number)
    return h * 60 + m
}

const toHHMM = (minutes) =>
    `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(
        minutes % 60
    ).padStart(2, '0')}`

const toDateKey = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
        date.getDate()
    ).padStart(2, '0')}`

const parseDateKey = (key) => {
    const [y, m, d] = key.split('-').map(Number)
    return new Date(y, m - 1, d)
}

const addDays = (key, delta) => {
    const date = parseDateKey(key)
    date.setDate(date.getDate() + delta)
    return toDateKey(date)
}

// Turn the user's rules into a scheduler config
const buildConfig = (rules) => {
    const config = {
        workStart: DEFAULT_WORK_START,
        workEnd: DEFAULT_WORK_END,
        dailyCap: DEFAULT_DAILY_CAP,
        blocked: [], // { days: [0-6], start, end } in minutes
        keywordHours: [], // { keyword (lowercase), minutes }
    }

    for (const rule of rules) {
        switch (rule.type) {
            case 'working-hours':
                config.workStart = toMinutes(rule.startTime)
                config.workEnd = toMinutes(rule.endTime)
                break
            case 'daily-cap':
                config.dailyCap = Math.round(rule.hours * 60)
                break
            case 'blocked-time':
                config.blocked.push({
                    days: rule.days ?? [],
                    start: toMinutes(rule.startTime),
                    end: toMinutes(rule.endTime),
                })
                break
            case 'keyword-hours':
                config.keywordHours.push({
                    keyword: rule.keyword.toLowerCase(),
                    minutes: Math.round(rule.hours * 60),
                })
                break
        }
    }
    return config
}

// Minutes of prep an item needs: keyword rules win over the item's own estimate
const prepMinutesFor = (item, config) => {
    const title = item.title.toLowerCase()
    const match = config.keywordHours.find((k) => title.includes(k.keyword))
    if (match) return match.minutes
    return Math.round((item.prepHours ?? 1) * 60)
}

// Free intervals within working hours on one day, given blocked rules and
// already-placed slots. Intervals are [start, end) minute pairs.
const freeIntervals = (dateKey, config, occupiedByDate) => {
    const weekday = parseDateKey(dateKey).getDay()
    const busy = [
        ...config.blocked
            .filter((b) => b.days.includes(weekday))
            .map((b) => [b.start, b.end]),
        ...(occupiedByDate[dateKey] ?? []),
    ].sort((a, b) => a[0] - b[0])

    const free = []
    let cursor = config.workStart
    for (const [start, end] of busy) {
        if (start > cursor) free.push([cursor, Math.min(start, config.workEnd)])
        cursor = Math.max(cursor, end)
        if (cursor >= config.workEnd) break
    }
    if (cursor < config.workEnd) free.push([cursor, config.workEnd])
    return free.filter(([s, e]) => e - s >= 30)
}

// Try to place one block of `minutes` on `dateKey`. Returns the slot or null.
const placeBlock = (dateKey, minutes, config, occupiedByDate, usedByDate) => {
    const used = usedByDate[dateKey] ?? 0
    const budget = Math.min(minutes, config.dailyCap - used)
    if (budget < 30) return null

    for (const [start, end] of freeIntervals(dateKey, config, occupiedByDate)) {
        const length = Math.min(budget, end - start)
        if (length < 30) continue
        const slot = { start, end: start + length }
        ;(occupiedByDate[dateKey] ??= []).push([slot.start, slot.end])
        usedByDate[dateKey] = used + length
        return slot
    }
    return null
}

// Rebuild the user's entire prep schedule from scratch.
// Blocks are spread backward from the due date (one per day per pass), so a
// Monday test gets prepped on Sunday first, then Saturday, and so on.
const replan = async (userId) => {
    const todayKey = toDateKey(new Date())

    const [rules, tasks, events, oldSlots] = await Promise.all([
        Rule.find({ userId }),
        Task.find({
            userId,
            needsPrep: true,
            completed: false,
            dueDate: { $gt: todayKey },
        }),
        Event.find({ userId, needsPrep: true, dueDate: { $gt: todayKey } }),
        PrepSlot.find({ userId }),
    ])

    const config = buildConfig(rules)
    const items = [
        ...tasks.map((t) => ({ item: t, type: 'task' })),
        ...events.map((e) => ({ item: e, type: 'event' })),
    ].sort((a, b) => a.item.dueDate.localeCompare(b.item.dueDate))

    const occupiedByDate = {}
    const usedByDate = {}
    const slots = []
    const warnings = []

    for (const { item, type } of items) {
        let remaining = prepMinutesFor(item, config)
        const requested = remaining

        // Candidate days: due date - 1 back to at most LOOKBACK_DAYS, never past
        const days = []
        for (let i = 1; i <= LOOKBACK_DAYS; i++) {
            const key = addDays(item.dueDate, -i)
            if (key < todayKey) break
            days.push(key)
        }

        // Multiple passes: one block per day per pass spreads the load
        for (let pass = 0; remaining >= 30 && pass < 10; pass++) {
            let placedThisPass = false
            for (const dateKey of days) {
                if (remaining < 30) break
                const block = placeBlock(
                    dateKey,
                    Math.min(remaining, BLOCK_MINUTES),
                    config,
                    occupiedByDate,
                    usedByDate
                )
                if (block) {
                    slots.push({
                        userId,
                        itemId: item._id,
                        itemType: type,
                        title: `Prep: ${item.title}`,
                        date: dateKey,
                        startTime: toHHMM(block.start),
                        endTime: toHHMM(block.end),
                    })
                    remaining -= block.end - block.start
                    placedThisPass = true
                }
            }
            if (!placedThisPass) break
        }

        if (remaining >= 30) {
            warnings.push(
                `Could not fit ${Math.round((remaining / 60) * 10) / 10}h of the ${
                    requested / 60
                }h needed for "${item.title}" (due ${item.dueDate}) — free up time or relax a rule.`
            )
        }
    }

    // If the plan is identical to what's stored, keep the existing slots
    // (and their gcalEventIds) — no DB or Google Calendar churn.
    const signature = (list) =>
        list
            .map((s) => `${s.itemId}|${s.date}|${s.startTime}|${s.endTime}`)
            .sort()
            .join(';')
    if (signature(slots) === signature(oldSlots)) {
        return { slots: oldSlots, warnings, changed: false, removedSlots: [] }
    }

    await PrepSlot.deleteMany({ userId })
    const created = slots.length > 0 ? await PrepSlot.insertMany(slots) : []

    return { slots: created, warnings, changed: true, removedSlots: oldSlots }
}

// Replan and mirror the result to Google Calendar (best-effort)
const replanAndSync = async (user) => {
    const result = await replan(user._id)
    if (result.changed) {
        await gcal.trySync(user, async () => {
            for (const old of result.removedSlots) {
                if (old.gcalEventId) await gcal.deleteItem(user, old.gcalEventId)
            }
            for (const slot of result.slots) {
                await gcal.upsertSlot(user, slot)
            }
        })
    }
    return result
}

module.exports = { replan, replanAndSync }
