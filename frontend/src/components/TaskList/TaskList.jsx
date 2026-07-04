import { Check, Circle, Flag, Trash2 } from 'lucide-react'
import { formatDueDate, isOverdue, parseDueDate } from '../../utils/date'
import './TaskList.scss'

const getPriorityClass = (priority) =>
    priority ? `${priority}-priority` : ''

const TaskList = ({ tasks, onToggleTask, onDeleteTask, onToggleFlag }) => {
    if (tasks.length === 0) {
        return (
            <div className="empty-state">
                <p>No tasks yet. Add your first task above!</p>
            </div>
        )
    }

    // Sort by due date (tasks without one go last), completed tasks at the bottom
    const sortedTasks = [...tasks].sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1
        const aDate = parseDueDate(a.dueDate)
        const bDate = parseDueDate(b.dueDate)
        if (!aDate && !bDate) return 0
        if (!aDate) return 1
        if (!bDate) return -1
        return aDate - bDate
    })

    return (
        <div className="task-list">
            {sortedTasks.map((task) => (
                <div
                    key={task.id}
                    className={`task-item ${getPriorityClass(task.priority)} ${
                        task.completed ? 'completed' : ''
                    }`}
                >
                    <div className="task-content">
                        <div className="task-title">{task.title}</div>
                        {task.description && (
                            <div className="task-description">
                                {task.description}
                            </div>
                        )}
                        <div className="task-details">
                            <span
                                className={
                                    !task.completed && isOverdue(task.dueDate)
                                        ? 'overdue'
                                        : ''
                                }
                            >
                                Due: {formatDueDate(task.dueDate)}
                            </span>
                        </div>
                    </div>
                    <div className="task-actions">
                        {onToggleFlag && task.dueDate && (
                            <button
                                className={`task-btn flag-btn ${
                                    task.needsPrep ? 'flagged' : ''
                                }`}
                                onClick={() => onToggleFlag(task)}
                                title={
                                    task.needsPrep
                                        ? `Flagged — ${task.prepHours}h prep scheduled`
                                        : 'Flag for prep time'
                                }
                            >
                                <Flag size={18} />
                            </button>
                        )}
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
                                <Check size={18} />
                            ) : (
                                <Circle size={18} />
                            )}
                        </button>
                        <button
                            className="task-btn delete-btn"
                            onClick={() => onDeleteTask(task.id)}
                            title="Delete task"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    )
}

export default TaskList
