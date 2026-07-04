require('dotenv').config()
const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')

const auth = require('./middleware/auth')
const authRouter = require('./routes/auth')
const tasksRouter = require('./routes/tasks')
const eventsRouter = require('./routes/events')
const documentsRouter = require('./routes/documents')
const googleRouter = require('./routes/google')
const rulesRouter = require('./routes/rules')
const plannerRouter = require('./routes/planner')

const app = express()
const PORT = process.env.PORT || 3001
const MONGODB_URI =
    process.env.MONGODB_URI || 'mongodb://localhost:27017/julius'

app.use(cors())
app.use(express.json())

app.get('/api/health', (req, res) => res.json({ status: 'ok' }))
app.use('/api/auth', authRouter)
app.use('/api/google', googleRouter) // /callback must stay public (OAuth redirect)
app.use('/api/tasks', auth, tasksRouter)
app.use('/api/events', auth, eventsRouter)
app.use('/api/documents', auth, documentsRouter)
app.use('/api/rules', auth, rulesRouter)
app.use('/api/planner', auth, plannerRouter)

// Error handler — surfaces parse/upload failures as JSON
app.use((err, req, res, next) => {
    console.error(err)
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
    })
})

const start = async () => {
    if (!process.env.JWT_SECRET) {
        console.error('JWT_SECRET is not set — add it to backend/.env')
        process.exit(1)
    }
    await mongoose.connect(MONGODB_URI)
    console.log('Connected to MongoDB')
    app.listen(PORT, () => {
        console.log(`Julius backend listening on http://localhost:${PORT}`)
    })
}

start().catch((err) => {
    console.error('Failed to start server:', err)
    process.exit(1)
})
