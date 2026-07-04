const mongoose = require('mongoose')

// A scheduling rule the prep planner must respect.
// Types:
//   blocked-time   — never schedule during [startTime, endTime) on the given weekdays
//                    (e.g. travel time Mon–Fri 08:00–09:00)
//   keyword-hours  — flagged items whose title matches `keyword` need `hours` of prep
//                    (e.g. every "MAT137" lecture needs 1 hour)
//   working-hours  — only schedule between [startTime, endTime) (one per user)
//   daily-cap      — at most `hours` of prep per day (one per user)
const ruleSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        type: {
            type: String,
            enum: ['blocked-time', 'keyword-hours', 'working-hours', 'daily-cap'],
            required: true,
        },
        label: { type: String, default: '' }, // e.g. "Travel time"
        days: [{ type: Number, min: 0, max: 6 }], // 0=Sun … 6=Sat (blocked-time)
        startTime: String, // 'HH:MM' (blocked-time, working-hours)
        endTime: String, // 'HH:MM'
        keyword: String, // (keyword-hours)
        hours: Number, // (keyword-hours, daily-cap)
    },
    { timestamps: true }
)

module.exports = mongoose.model('Rule', ruleSchema)
