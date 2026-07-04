// Date helpers — due dates are stored as 'YYYY-MM-DD' strings.
// Parse manually so dates stay in local time (new Date('YYYY-MM-DD') is UTC).

export const parseDueDate = (dateString) => {
    if (!dateString) return null
    const [year, month, day] = dateString.split('-').map(Number)
    return new Date(year, month - 1, day)
}

export const toDateKey = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
        date.getDate()
    ).padStart(2, '0')}`

export const formatDueDate = (dateString) => {
    const date = parseDueDate(dateString)
    if (!date) return 'No due date'
    return date.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    })
}

export const isToday = (date) => toDateKey(date) === toDateKey(new Date())

export const isOverdue = (dateString) => {
    const date = parseDueDate(dateString)
    if (!date) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
}
