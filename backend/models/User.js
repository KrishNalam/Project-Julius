const mongoose = require('mongoose')

const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        passwordHash: { type: String, required: true },
        google: {
            connected: { type: Boolean, default: false },
            accessToken: String,
            refreshToken: String,
            expiryDate: Number,
            calendarId: String,
        },
    },
    { timestamps: true }
)

module.exports = mongoose.model('User', userSchema)
