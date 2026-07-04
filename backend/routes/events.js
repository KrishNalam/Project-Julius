const express = require('express')
const Event = require('../models/Event')
const User = require('../models/User')
const gcal = require('../services/googleCalendar')
const { replanAndSync } = require('../services/scheduler')

const router = express.Router()

// GET /api/events
router.get('/', async (req, res, next) => {
    try {
        const events = await Event.find({ userId: req.userId }).sort({ createdAt: 1 })
        res.json(events)
    } catch (err) {
        next(err)
    }
})

// POST /api/events/bulk — import a batch of dates from a parsed document
router.post('/bulk', async (req, res, next) => {
    try {
        const { events } = req.body
        if (!Array.isArray(events) || events.length === 0) {
            return res.status(400).json({ error: 'No events provided' })
        }

        const created = await Event.insertMany(
            events.map((e) => ({
                userId: req.userId,
                title: e.title,
                context: e.context ?? '',
                dueDate: e.dueDate,
                source: e.source,
                needsPrep: e.needsPrep ?? false,
                prepHours: e.prepHours ?? 1,
            }))
        )

        const user = await User.findById(req.userId)
        for (const event of created) {
            await gcal.trySync(user, () => gcal.upsertItem(user, event, 'event'))
        }
        await replanAndSync(user)
        res.status(201).json(created)
    } catch (err) {
        next(err)
    }
})

// PATCH /api/events/:id — flag/unflag for prep, adjust prep hours
router.patch('/:id', async (req, res, next) => {
    try {
        const event = await Event.findOne({
            _id: req.params.id,
            userId: req.userId,
        })
        if (!event) return res.status(404).json({ error: 'Event not found' })

        for (const key of ['needsPrep', 'prepHours']) {
            if (key in req.body) event[key] = req.body[key]
        }
        await event.save()

        const user = await User.findById(req.userId)
        await replanAndSync(user)
        res.json(event)
    } catch (err) {
        next(err)
    }
})

// DELETE /api/events/by-source/:source — remove every event from one document
router.delete('/by-source/:source', async (req, res, next) => {
    try {
        const events = await Event.find({
            userId: req.userId,
            source: req.params.source,
        })
        await Event.deleteMany({ userId: req.userId, source: req.params.source })

        const user = await User.findById(req.userId)
        for (const event of events) {
            if (event.gcalEventId) {
                await gcal.trySync(user, () =>
                    gcal.deleteItem(user, event.gcalEventId)
                )
            }
        }
        await replanAndSync(user)
        res.json({ deleted: events.length })
    } catch (err) {
        next(err)
    }
})

// DELETE /api/events/:id
router.delete('/:id', async (req, res, next) => {
    try {
        const event = await Event.findOneAndDelete({
            _id: req.params.id,
            userId: req.userId,
        })
        if (!event) return res.status(404).json({ error: 'Event not found' })

        const user = await User.findById(req.userId)
        if (event.gcalEventId) {
            await gcal.trySync(user, () => gcal.deleteItem(user, event.gcalEventId))
        }
        await replanAndSync(user)
        res.json({ deleted: true })
    } catch (err) {
        next(err)
    }
})

module.exports = router
