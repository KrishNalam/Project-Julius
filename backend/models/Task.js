const mongoose = require('mongoose')

const taskSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        title: { type: String, required: true, trim: true },
        description: { type: String, default: '' },
        dueDate: { type: String, default: '' }, // 'YYYY-MM-DD', matches frontend
        priority: {
            type: String,
            enum: ['low', 'medium', 'high'],
            default: 'medium',
        },
        completed: { type: Boolean, default: false },
        needsPrep: { type: Boolean, default: false }, // flagged for prep time
        prepHours: { type: Number, default: 1, min: 0.5, max: 40 },
        gcalEventId: String, // set once synced to Google Calendar
    },
    { timestamps: true }
)

module.exports = mongoose.model('Task', taskSchema)
