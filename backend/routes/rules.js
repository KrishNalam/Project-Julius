const express = require('express')
const Rule = require('../models/Rule')
const User = require('../models/User')
const { replanAndSync } = require('../services/scheduler')

const router = express.Router()

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

const validate = (rule) => {
    switch (rule.type) {
        case 'blocked-time':
            if (!rule.days?.length) return 'Pick at least one day'
            if (!HHMM.test(rule.startTime || '') || !HHMM.test(rule.endTime || ''))
                return 'Start and end times are required (HH:MM)'
            if (rule.startTime >= rule.endTime) return 'End time must be after start'
            return null
        case 'working-hours':
            if (!HHMM.test(rule.startTime || '') || !HHMM.test(rule.endTime || ''))
                return 'Start and end times are required (HH:MM)'
            if (rule.startTime >= rule.endTime) return 'End time must be after start'
            return null
        case 'keyword-hours':
            if (!rule.keyword?.trim()) return 'Keyword is required'
            if (!(rule.hours > 0)) return 'Hours must be positive'
            return null
        case 'daily-cap':
            if (!(rule.hours > 0)) return 'Hours must be positive'
            return null
        default:
            return 'Unknown rule type'
    }
}

// GET /api/rules
router.get('/', async (req, res, next) => {
    try {
        res.json(await Rule.find({ userId: req.userId }).sort({ createdAt: 1 }))
    } catch (err) {
        next(err)
    }
})

// POST /api/rules
router.post('/', async (req, res, next) => {
    try {
        const { type, label, days, startTime, endTime, keyword, hours } = req.body
        const error = validate(req.body)
        if (error) return res.status(400).json({ error })

        // working-hours and daily-cap are singletons — replace any existing one
        if (type === 'working-hours' || type === 'daily-cap') {
            await Rule.deleteMany({ userId: req.userId, type })
        }

        const rule = await Rule.create({
            userId: req.userId,
            type,
            label: label?.trim() ?? '',
            days,
            startTime,
            endTime,
            keyword: keyword?.trim(),
            hours,
        })

        const user = await User.findById(req.userId)
        await replanAndSync(user)
        res.status(201).json(rule)
    } catch (err) {
        next(err)
    }
})

// DELETE /api/rules/:id
router.delete('/:id', async (req, res, next) => {
    try {
        const rule = await Rule.findOneAndDelete({
            _id: req.params.id,
            userId: req.userId,
        })
        if (!rule) return res.status(404).json({ error: 'Rule not found' })

        const user = await User.findById(req.userId)
        await replanAndSync(user)
        res.json({ deleted: true })
    } catch (err) {
        next(err)
    }
})

module.exports = router
