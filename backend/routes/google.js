const express = require('express')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const auth = require('../middleware/auth')
const gcal = require('../services/googleCalendar')

const router = express.Router()

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'
const SCOPES = ['https://www.googleapis.com/auth/calendar']

// GET /api/google/status
router.get('/status', auth, async (req, res, next) => {
    try {
        const user = await User.findById(req.userId)
        res.json({
            configured: gcal.isConfigured(),
            connected: user?.google?.connected ?? false,
        })
    } catch (err) {
        next(err)
    }
})

// GET /api/google/auth-url — returns the consent screen URL
router.get('/auth-url', auth, (req, res) => {
    if (!gcal.isConfigured()) {
        return res.status(503).json({
            error: 'Google sync is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env.',
        })
    }

    // The callback arrives as a browser redirect with no auth header,
    // so carry the user id in a short-lived signed state token.
    const state = jwt.sign({ userId: req.userId }, process.env.JWT_SECRET, {
        expiresIn: '10m',
    })

    const url = gcal.createOAuthClient().generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: SCOPES,
        state,
    })
    res.json({ url })
})

// GET /api/google/callback — OAuth redirect target
router.get('/callback', async (req, res) => {
    try {
        const { code, state, error } = req.query
        if (error || !code) {
            return res.redirect(`${FRONTEND_URL}/?google=denied`)
        }

        const { userId } = jwt.verify(state, process.env.JWT_SECRET)
        const user = await User.findById(userId)
        if (!user) return res.redirect(`${FRONTEND_URL}/?google=error`)

        const { tokens } = await gcal.createOAuthClient().getToken(code)
        user.google.connected = true
        user.google.accessToken = tokens.access_token
        if (tokens.refresh_token) user.google.refreshToken = tokens.refresh_token
        user.google.expiryDate = tokens.expiry_date
        await user.save()

        // Push everything they already have, then land back in the app
        await gcal.trySync(user, () => gcal.syncAll(user))
        res.redirect(`${FRONTEND_URL}/?google=connected`)
    } catch (err) {
        console.error('Google OAuth callback failed:', err.message)
        res.redirect(`${FRONTEND_URL}/?google=error`)
    }
})

// POST /api/google/sync — manual full sync
router.post('/sync', auth, async (req, res, next) => {
    try {
        const user = await User.findById(req.userId)
        if (!user?.google?.connected) {
            return res.status(400).json({ error: 'Google Calendar is not connected' })
        }
        const synced = await gcal.syncAll(user)
        res.json({ synced })
    } catch (err) {
        next(err)
    }
})

// DELETE /api/google/disconnect
router.delete('/disconnect', auth, async (req, res, next) => {
    try {
        const user = await User.findById(req.userId)
        if (user) {
            user.google = { connected: false }
            await user.save()
        }
        res.json({ connected: false })
    } catch (err) {
        next(err)
    }
})

module.exports = router
