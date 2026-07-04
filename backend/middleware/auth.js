const jwt = require('jsonwebtoken')

// Verifies the Bearer token and attaches req.userId
const auth = (req, res, next) => {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null

    if (!token) {
        return res.status(401).json({ error: 'Not authenticated' })
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET)
        req.userId = payload.userId
        next()
    } catch {
        res.status(401).json({ error: 'Invalid or expired session' })
    }
}

module.exports = auth
