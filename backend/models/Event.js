const mongoose = require('mongoose')

// A calendar event imported from a document
const eventSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        title: { type: String, required: true },
        context: { type: String, default: '' },
        dueDate: { type: String, required: true }, // 'YYYY-MM-DD'
        source: { type: String, required: true }, // originating document filename
        needsPrep: { type: Boolean, default: false }, // flagged for prep time
        prepHours: { type: Number, default: 1, min: 0.5, max: 40 },
        gcalEventId: String, // set once synced to Google Calendar
    },
    { timestamps: true }
)

module.exports = mongoose.model('Event', eventSchema)
