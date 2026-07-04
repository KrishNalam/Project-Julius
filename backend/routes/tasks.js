const express = require('express')
const Task = require('../models/Task')
const User = require('../models/User')
const gcal = require('../services/googleCalendar')
const { replanAndSync } = require('../services/scheduler')

const router = express.Router()

// GET /api/tasks
router.get('/', async (req, res, next) => {
    try {
        const tasks = await Task.find({ userId: req.userId }).sort({ createdAt: 1 })
        res.json(tasks)
    } catch (err) {
        next(err)
    }
})

// POST /api/tasks
router.post('/', async (req, res, next) => {
    try {
        const {
            title,
            description = '',
            dueDate = '',
            priority = 'medium',
            needsPrep = false,
            prepHours = 1,
        } = req.body
        if (!title?.trim()) {
            return res.status(400).json({ error: 'Title is required' })
        }

        const task = await Task.create({
            userId: req.userId,
            title: title.trim(),
            description,
            dueDate,
            priority,
            needsPrep,
            prepHours,
        })

        const user = await User.findById(req.userId)
        if (task.dueDate) {
            await gcal.trySync(user, () => gcal.upsertItem(user, task, 'task'))
        }
        await replanAndSync(user)
        res.status(201).json(task)
    } catch (err) {
        next(err)
    }
})

// PATCH /api/tasks/:id
router.patch('/:id', async (req, res, next) => {
    try {
        const task = await Task.findOne({ _id: req.params.id, userId: req.userId })
        if (!task) return res.status(404).json({ error: 'Task not found' })

        const allowed = [
            'title',
            'description',
            'dueDate',
            'priority',
            'completed',
            'needsPrep',
            'prepHours',
        ]
        for (const key of allowed) {
            if (key in req.body) task[key] = req.body[key]
        }
        await task.save()

        const user = await User.findById(req.userId)
        if (task.dueDate) {
            await gcal.trySync(user, () => gcal.upsertItem(user, task, 'task'))
        } else if (task.gcalEventId) {
            // Due date removed — take it off the calendar
            await gcal.trySync(user, () => gcal.deleteItem(user, task.gcalEventId))
            task.gcalEventId = undefined
            await task.save()
        }
        await replanAndSync(user)
        res.json(task)
    } catch (err) {
        next(err)
    }
})

// DELETE /api/tasks/:id
router.delete('/:id', async (req, res, next) => {
    try {
        const task = await Task.findOneAndDelete({
            _id: req.params.id,
            userId: req.userId,
        })
        if (!task) return res.status(404).json({ error: 'Task not found' })

        const user = await User.findById(req.userId)
        if (task.gcalEventId) {
            await gcal.trySync(user, () => gcal.deleteItem(user, task.gcalEventId))
        }
        await replanAndSync(user)
        res.json({ deleted: true })
    } catch (err) {
        next(err)
    }
})

module.exports = router
