const express = require('express')
const multer = require('multer')
const { extractText } = require('../services/textExtractor')
const { extractDates } = require('../services/dateExtractor')

const router = express.Router()

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
})

// POST /api/documents/parse — upload a document, get back every date found in it
router.post('/parse', upload.single('document'), async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' })
        }

        const text = await extractText(req.file)
        const dates = extractDates(text)

        res.json({
            filename: req.file.originalname,
            dates,
        })
    } catch (err) {
        next(err)
    }
})

module.exports = router
