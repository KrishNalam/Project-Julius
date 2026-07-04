const chrono = require('chrono-node')

const CONTEXT_RADIUS = 60

// Format a Date as a local 'YYYY-MM-DD' key (matches the frontend convention)
const toDateKey = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
        date.getDate()
    ).padStart(2, '0')}`

// Grab the text surrounding a match so the user can tell what the date refers to
const getContext = (text, index, matchLength) => {
    const start = Math.max(0, index - CONTEXT_RADIUS)
    const end = Math.min(text.length, index + matchLength + CONTEXT_RADIUS)
    const snippet = text.slice(start, end).replace(/\s+/g, ' ').trim()
    return `${start > 0 ? '…' : ''}${snippet}${end < text.length ? '…' : ''}`
}

// Find all dates in a block of text. Returns one entry per match:
// { dateKey, matchedText, context }
const extractDates = (text) => {
    const results = chrono.parse(text)

    return results
        // Only keep matches where chrono actually saw a day — bare month/year
        // mentions ("in 2026", "January") produce noisy implied days.
        .filter((r) => r.start.isCertain('day') || r.start.isCertain('weekday'))
        .map((r) => ({
            dateKey: toDateKey(r.start.date()),
            matchedText: r.text,
            context: getContext(text, r.index, r.text.length),
        }))
}

module.exports = { extractDates }
