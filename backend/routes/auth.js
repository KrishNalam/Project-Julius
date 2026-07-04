const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const auth = require('../middleware/auth')

const router = express.Router()

const signToken = (userId) =>
    jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' })

const publicUser = (user) => ({
    id: user._id,
    email: user.email,
    googleConnected: user.google?.connected ?? false,
})

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
    try {
        const { email, password } = req.body
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' })
        }
        if (password.length < 8) {
            return res
                .status(400)
                .json({ error: 'Password must be at least 8 characters' })
        }

        const existing = await User.findOne({ email: email.toLowerCase().trim() })
        if (existing) {
            return res.status(409).json({ error: 'An account with that email already exists' })
        }

        const passwordHash = await bcrypt.hash(password, 10)
        const user = await User.create({ email, passwordHash })

        res.status(201).json({ token: signToken(user._id), user: publicUser(user) })
    } catch (err) {
        next(err)
    }
})

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
    try {
        const { email, password } = req.body
        const user = await User.findOne({ email: (email || '').toLowerCase().trim() })

        if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) {
            return res.status(401).json({ error: 'Incorrect email or password' })
        }

        res.json({ token: signToken(user._id), user: publicUser(user) })
    } catch (err) {
        next(err)
    }
})

// GET /api/auth/me
router.get('/me', auth, async (req, res, next) => {
    try {
        const user = await User.findById(req.userId)
        if (!user) return res.status(401).json({ error: 'Account not found' })
        res.json({ user: publicUser(user) })
    } catch (err) {
        next(err)
    }
})

module.exports = router
