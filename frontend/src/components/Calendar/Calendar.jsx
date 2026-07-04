import { useMemo, useState } from 'react'
import {
    Check,
    ChevronLeft,
    ChevronRight,
    Circle,
    FileText,
    Trash2,
} from 'lucide-react'
import TaskForm from '../TaskForm/TaskForm'
import { isToday, parseDueDate, toDateKey } from '../../utils/date'
import './Calendar.scss'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Build a 6-week grid (42 days) covering the given month
const buildMonthGrid = (year, month) => {
    const firstOfMonth = new Date(year, month, 1)
    const gridStart = new Date(year, month, 1 - firstOfMonth.getDay())

    return Array.from({ length: 42 }, (_, i) => {
        const date = new Date(
            gridStart.getFullYear(),
            gridStart.getMonth(),
            gridStart.getDate() + i
        )
        return {
            date,
            key: toDateKey(date),
            inMonth: date.getMonth() === month,
        }
    })
}

const Calendar = ({
    tasks,
    events = [],
    prepSlots = [],
    onAddTask,
    onToggleTask,
    onDeleteTask,
    onDeleteEvent,
}) => {
    const today = new Date()
    const [year, setYear] = useState(today.getFullYear())
    const [month, setMonth] = useState(today.getMonth())
    const [selectedKey, setSelectedKey] = useState(toDateKey(today))

    const grid = useMemo(() => buildMonthGrid(year, month), [year, month])

    // Group tasks by due date key
    const tasksByDate = useMemo(() => {
        const map = {}
        for (const task of tasks) {
            if (!task.dueDate) continue
            ;(map[task.dueDate] ??= []).push(task)
        }
        return map
    }, [tasks])

    // Group document events by date key
    const eventsByDate = useMemo(() => {
        const map = {}
        for (const event of events) {
            if (!event.dueDate) continue
            ;(map[event.dueDate] ??= []).push(event)
        }
        return map
    }, [events])

    // Group prep slots by date key
    const slotsByDate = useMemo(() => {
        const map = {}
        for (const slot of prepSlots) {
            ;(map[slot.date] ??= []).push(slot)
        }
        for (const key in map) {
            map[key].sort((a, b) => a.startTime.localeCompare(b.startTime))
        }
        return map
    }, [prepSlots])

    const goToMonth = (offset) => {
        const next = new Date(year, month + offset, 1)
        setYear(next.getFullYear())
        setMonth(next.getMonth())
    }

    const goToToday = () => {
        setYear(today.getFullYear())
        setMonth(today.getMonth())
        setSelectedKey(toDateKey(today))
    }

    const selectDay = (day) => {
        setSelectedKey(day.key)
        if (!day.inMonth) {
            setYear(day.date.getFullYear())
            setMonth(day.date.getMonth())
        }
    }

    const monthLabel = new Date(year, month).toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
    })

    const selectedDate = parseDueDate(selectedKey)
    const selectedTasks = tasksByDate[selectedKey] ?? []
    const selectedEvents = eventsByDate[selectedKey] ?? []
    const selectedSlots = slotsByDate[selectedKey] ?? []

    return (
        <div className="calendar-page">
            <div className="calendar card">
                <div className="calendar-header">
                    <h2 className="calendar-title">{monthLabel}</h2>
                    <div className="calendar-controls">
                        <button
                            className="control-btn"
                            onClick={() => goToMonth(-1)}
                            title="Previous month"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button
                            className="control-btn today-btn"
                            onClick={goToToday}
                        >
                            Today
                        </button>
                        <button
                            className="control-btn"
                            onClick={() => goToMonth(1)}
                            title="Next month"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

                <div className="calendar-grid weekday-row">
                    {WEEKDAYS.map((day) => (
                        <div key={day} className="weekday">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="calendar-grid day-grid">
                    {grid.map((day) => {
                        const dayItems = [
                            ...(slotsByDate[day.key] ?? []).map((slot) => ({
                                item: slot,
                                kind: 'prep',
                            })),
                            ...(tasksByDate[day.key] ?? []).map((task) => ({
                                item: task,
                                kind: 'task',
                            })),
                            ...(eventsByDate[day.key] ?? []).map((event) => ({
                                item: event,
                                kind: 'event',
                            })),
                        ]
                        return (
                            <button
                                key={day.key}
                                className={[
                                    'day-cell',
                                    day.inMonth ? '' : 'outside',
                                    isToday(day.date) ? 'today' : '',
                                    day.key === selectedKey ? 'selected' : '',
                                ]
                                    .filter(Boolean)
                                    .join(' ')}
                                onClick={() => selectDay(day)}
                            >
                                <span className="day-number">
                                    {day.date.getDate()}
                                </span>
                                <div className="day-tasks">
                                    {dayItems
                                        .slice(0, 3)
                                        .map(({ item, kind }) =>
                                            kind === 'task' ? (
                                                <span
                                                    key={`t-${item.id}`}
                                                    className={`task-chip ${
                                                        item.priority ??
                                                        'medium'
                                                    } ${item.completed ? 'done' : ''}`}
                                                >
                                                    {item.title}
                                                </span>
                                            ) : kind === 'event' ? (
                                                <span
                                                    key={`e-${item.id}`}
                                                    className="task-chip event"
                                                >
                                                    {item.title}
                                                </span>
                                            ) : (
                                                <span
                                                    key={`p-${item.id}`}
                                                    className="task-chip prep"
                                                >
                                                    {item.startTime}{' '}
                                                    {item.title}
                                                </span>
                                            )
                                        )}
                                    {dayItems.length > 3 && (
                                        <span className="more-count">
                                            +{dayItems.length - 3} more
                                        </span>
                                    )}
                                </div>
                            </button>
                        )
                    })}
                </div>
            </div>

            <div className="day-panel card">
                <h2 className="section-title">
                    {selectedDate.toLocaleDateString(undefined, {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                    })}
                </h2>

                {selectedTasks.length === 0 &&
                selectedEvents.length === 0 &&
                selectedSlots.length === 0 ? (
                    <p className="no-tasks">Nothing due this day.</p>
                ) : null}

                {selectedSlots.length > 0 && (
                    <div className="day-task-list">
                        {selectedSlots.map((slot) => (
                            <div key={slot.id} className="day-task prep">
                                <div className="day-task-info">
                                    <span className="day-task-title">
                                        <span className="slot-time">
                                            {slot.startTime}–{slot.endTime}
                                        </span>{' '}
                                        {slot.title}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {selectedTasks.length > 0 && (
                    <div className="day-task-list">
                        {selectedTasks.map((task) => (
                            <div
                                key={task.id}
                                className={`day-task ${task.priority ?? 'medium'} ${
                                    task.completed ? 'completed' : ''
                                }`}
                            >
                                <div className="day-task-info">
                                    <span className="day-task-title">
                                        {task.title}
                                    </span>
                                    {task.description && (
                                        <span className="day-task-desc">
                                            {task.description}
                                        </span>
                                    )}
                                </div>
                                <div className="day-task-actions">
                                    <button
                                        className="task-btn complete-btn"
                                        onClick={() => onToggleTask(task.id)}
                                        title={
                                            task.completed
                                                ? 'Mark as incomplete'
                                                : 'Mark as complete'
                                        }
                                    >
                                        {task.completed ? (
                                            <Check size={16} />
                                        ) : (
                                            <Circle size={16} />
                                        )}
                                    </button>
                                    <button
                                        className="task-btn delete-btn"
                                        onClick={() => onDeleteTask(task.id)}
                                        title="Delete task"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {selectedEvents.length > 0 && (
                    <div className="day-task-list">
                        {selectedEvents.map((event) => (
                            <div key={event.id} className="day-task event">
                                <div className="day-task-info">
                                    <span className="day-task-title">
                                        {event.title}
                                    </span>
                                    <span
                                        className="day-task-desc"
                                        title={event.context}
                                    >
                                        {event.context}
                                    </span>
                                    <span className="day-task-source">
                                        <FileText size={12} />
                                        {event.source}
                                    </span>
                                </div>
                                <div className="day-task-actions">
                                    <button
                                        className="task-btn delete-btn"
                                        onClick={() => onDeleteEvent(event.id)}
                                        title="Remove from calendar"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <h3 className="panel-subtitle">Add task for this day</h3>
                <TaskForm
                    key={selectedKey}
                    onAddTask={onAddTask}
                    initialDueDate={selectedKey}
                />
            </div>
        </div>
    )
}

export default Calendar
