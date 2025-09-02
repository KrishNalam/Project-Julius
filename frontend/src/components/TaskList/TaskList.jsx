import './TaskList.scss'

const TaskList = ({
    tasks,
    onToggleTask,
    onDeleteTask,
    onExportToCalendar,
}) => {
    const formatDate = (dateString) => {
        if (!dateString) return 'No due date'
        return new Date(dateString).toLocaleDateString()
    }

    if (tasks.length === 0) {
        return (
            <div className="empty-state">
                <p>No tasks yet. Add your first task above!</p>
            </div>
        )
    }

    return (
        <div>
            <div className="task-list">
                {tasks.map((task) => (
                    <div
                        key={task.id}
                        className={`task-item ${getPriorityClass(
                            task.priority
                        )} ${task.completed ? 'completed' : ''}`}
                    >
                        <div className="task-content">
                            <div className="task-title">{task.title}</div>
                            <div className="task-details">
                                <span>Due: {formatDate(task.dueDate)}</span>
                            </div>
                        </div>
                        <div className="task-actions">
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

            <div className="calendar-section">
                <h3>Export to Google Calendar</h3>
                <p>Add your tasks with due dates to your calendar</p>
                <button className="calendar-btn" onClick={onExportToCalendar}>
                    <Calendar size={18} />
                    Export to Calendar
                </button>
            </div>
        </div>
    )
}

export default TaskList
