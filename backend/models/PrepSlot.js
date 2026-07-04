const mongoose = require('mongoose')

// An auto-scheduled block of prep time for a flagged task/event.
// Slots are regenerated wholesale whenever the schedule or rules change.
const prepSlotSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        itemId: { type: mongoose.Schema.Types.ObjectId, required: true },
        itemType: { type: String, enum: ['task', 'event'], required: true },
        title: { type: String, required: true }, // "Prep: <item title>"
        date: { type: String, required: true }, // 'YYYY-MM-DD'
        startTime: { type: String, required: true }, // 'HH:MM'
        endTime: { type: String, required: true }, // 'HH:MM'
        gcalEventId: String,
    },
    { timestamps: true }
)

module.exports = mongoose.model('PrepSlot', prepSlotSchema)
