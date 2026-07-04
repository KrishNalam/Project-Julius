import { useState } from 'react'
import {
    AlertTriangle,
    BookOpen,
    CalendarClock,
    Clock,
    Plus,
    ShieldBan,
    Sun,
    Trash2,
} from 'lucide-react'
import { formatDueDate } from '../../utils/date'
import './Planner.scss'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const RULE_TYPES = [
    {
        value: 'blocked-time',
        label: 'Blocked time',
        hint: 'Never schedule prep here — travel, meals, practice…',
    },
    {
        value: 'keyword-hours',
        label: 'Prep amount by keyword',
        hint: 'e.g. every "MAT137" item needs 1 hour of prep',
    },
    {
        value: 'working-hours',
        label: 'Working hours',
        hint: 'Only schedule prep inside this window (default 09:00–21:00)',
    },
    {
        value: 'daily-cap',
        label: 'Daily limit',
        hint: 'Max hours of prep per day (default 4)',
    },
]

const RULE_ICONS = {
    'blocked-time': ShieldBan,
    'keyword-hours': BookOpen,
    'working-hours': Sun,
    'daily-cap': Clock,
}

const describeRule = (rule) => {
    switch (rule.type) {
        case 'blocked-time':
            return `${rule.label || 'Blocked'}: ${rule.days
                .map((d) => DAY_LABELS[d])
                .join(', ')} ${rule.startTime}–${rule.endTime}`
        case 'keyword-hours':
            return `"${rule.keyword}" items need ${rule.hours}h of prep`
        case 'working-hours':
            return `Only schedule between ${rule.startTime}–${rule.endTime}`
        case 'daily-cap':
            return `At most ${rule.hours}h of prep per day`
        default:
            return rule.type
    }
}

const emptyForm = {
    type: 'blocked-time',
    label: '',
    days: [],
    startTime: '',
    endTime: '',
    keyword: '',
    hours: 1,
}

const Planner = ({ rules, slots, warnings, onAddRule, onDeleteRule }) => {
    const [form, setForm] = useState(emptyForm)
    const [error, setError] = useState(null)
    const [busy, setBusy] = useState(false)

    const set = (patch) => setForm((f) => ({ ...f, ...patch }))

    const toggleDay = (day) =>
        set({
            days: form.days.includes(day)
                ? form.days.filter((d) => d !== day)
                : [...form.days, day].sort(),
        })

    const submit = async (e) => {
        e.preventDefault()
        setBusy(true)
        setError(null)
        try {
            await onAddRule(form)
            setForm(emptyForm)
        } catch (err) {
            setError(err.message)
        } finally {
            setBusy(false)
        }
    }

    // Slots grouped by date, soonest first
    const slotsByDate = slots.reduce((map, slot) => {
        ;(map[slot.date] ??= []).push(slot)
        return map
    }, {})
    const dates = Object.keys(slotsByDate).sort()

    const typeInfo = RULE_TYPES.find((t) => t.value === form.type)

    return (
        <div className="planner-page">
            <div className="rules-section card">
                <h2 className="section-title">Scheduling Rules</h2>

                <form className="rule-form" onSubmit={submit}>
                    <div className="form-group">
                        <label htmlFor="rule-type">Rule type</label>
                        <select
                            id="rule-type"
                            value={form.type}
                            onChange={(e) =>
                                setForm({ ...emptyForm, type: e.target.value })
                            }
                        >
                            {RULE_TYPES.map((t) => (
                                <option key={t.value} value={t.value}>
                                    {t.label}
                                </option>
                            ))}
                        </select>
                        <span className="rule-hint">{typeInfo.hint}</span>
                    </div>

                    {form.type === 'blocked-time' && (
                        <>
                            <div className="form-group">
                                <label htmlFor="rule-label">Label</label>
                                <input
                                    id="rule-label"
                                    type="text"
                                    placeholder="e.g. Travel time"
                                    value={form.label}
                                    onChange={(e) =>
                                        set({ label: e.target.value })
                                    }
                                />
                            </div>
                            <div className="form-group">
                                <label>Days</label>
                                <div className="day-picker">
                                    {DAY_LABELS.map((label, day) => (
                                        <button
                                            key={day}
                                            type="button"
                                            className={`day-pill ${
                                                form.days.includes(day)
                                                    ? 'on'
                                                    : ''
                                            }`}
                                            onClick={() => toggleDay(day)}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {(form.type === 'blocked-time' ||
                        form.type === 'working-hours') && (
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="rule-start">From</label>
                                <input
                                    id="rule-start"
                                    type="time"
                                    value={form.startTime}
                                    onChange={(e) =>
                                        set({ startTime: e.target.value })
                                    }
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="rule-end">To</label>
                                <input
                                    id="rule-end"
                                    type="time"
                                    value={form.endTime}
                                    onChange={(e) =>
                                        set({ endTime: e.target.value })
                                    }
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {form.type === 'keyword-hours' && (
                        <div className="form-row">
                            <div className="form-group">
                                <label htmlFor="rule-keyword">Keyword</label>
                                <input
                                    id="rule-keyword"
                                    type="text"
                                    placeholder="e.g. MAT137"
                                    value={form.keyword}
                                    onChange={(e) =>
                                        set({ keyword: e.target.value })
                                    }
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="rule-hours">Hours</label>
                                <input
                                    id="rule-hours"
                                    type="number"
                                    min="0.5"
                                    max="40"
                                    step="0.5"
                                    value={form.hours}
                                    onChange={(e) =>
                                        set({ hours: e.target.value })
                                    }
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {form.type === 'daily-cap' && (
                        <div className="form-group">
                            <label htmlFor="rule-cap">Hours per day</label>
                            <input
                                id="rule-cap"
                                type="number"
                                min="0.5"
                                max="16"
                                step="0.5"
                                value={form.hours}
                                onChange={(e) => set({ hours: e.target.value })}
                                required
                            />
                        </div>
                    )}

                    {error && <p className="rule-error">{error}</p>}

                    <button type="submit" className="add-rule-btn" disabled={busy}>
                        <Plus size={18} />
                        Add Rule
                    </button>
                </form>

                <div className="rule-list">
                    {rules.length === 0 ? (
                        <p className="empty-msg">
                            No rules yet — the planner uses 09:00–21:00 with at
                            most 4h of prep per day.
                        </p>
                    ) : (
                        rules.map((rule) => {
                            const Icon = RULE_ICONS[rule.type]
                            return (
                                <div key={rule.id} className="rule-item">
                                    <Icon size={16} className="rule-icon" />
                                    <span className="rule-text">
                                        {describeRule(rule)}
                                    </span>
                                    <button
                                        className="task-btn delete-btn"
                                        onClick={() => onDeleteRule(rule.id)}
                                        title="Delete rule"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>

            <div className="schedule-section card">
                <h2 className="section-title">
                    <CalendarClock size={20} />
                    Prep Schedule
                </h2>

                {warnings.length > 0 && (
                    <div className="warnings">
                        {warnings.map((warning, i) => (
                            <p key={i} className="warning">
                                <AlertTriangle size={16} />
                                {warning}
                            </p>
                        ))}
                    </div>
                )}

                {dates.length === 0 ? (
                    <p className="empty-msg">
                        Nothing scheduled. Flag a task or imported date (the{' '}
                        <strong>⚑ flag</strong>) and prep time will be allocated
                        automatically before it's due.
                    </p>
                ) : (
                    dates.map((date) => (
                        <div key={date} className="schedule-day">
                            <h3 className="schedule-date">
                                {formatDueDate(date)}
                            </h3>
                            {slotsByDate[date]
                                .sort((a, b) =>
                                    a.startTime.localeCompare(b.startTime)
                                )
                                .map((slot) => (
                                    <div key={slot.id} className="slot">
                                        <span className="slot-time">
                                            {slot.startTime}–{slot.endTime}
                                        </span>
                                        <span className="slot-title">
                                            {slot.title}
                                        </span>
                                    </div>
                                ))}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

export default Planner
