const express = require('express')
const User = require('../models/User')
const { replanAndSync } = require('../services/scheduler')

const router = express.Router()

// GET /api/planner — current prep schedule (replans if anything changed;
// idempotent when nothing has)
router.get('/', async (req, res, next) => {
    try {
        const user = await User.findById(req.userId)
        const { slots, warnings } = await replanAndSync(user)
        res.json({ slots, warnings })
    } catch (err) {
        next(err)
    }
})

module.exports = router
