import { useState } from 'react'
import './TaskForm.scss'

const TaskForm = ({ onAddTask, initialDueDate = '' }) => {
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [dueDate, setDueDate] = useState(initialDueDate)
    const [priority, setPriority] = useState('medium')
    const [needsPrep, setNeedsPrep] = useState(false)
    const [prepHours, setPrepHours] = useState(1)

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!title.trim()) return

        onAddTask({
            title: title.trim(),
            description: description.trim(),
            dueDate,
            priority,
            needsPrep,
            prepHours: Number(prepHours) || 1,
        })

        // Reset form
        setTitle('')
        setDescription('')
        setDueDate(initialDueDate)
        setPriority('medium')
        setNeedsPrep(false)
        setPrepHours(1)
    }

    return (
        <form className="task-form" onSubmit={handleSubmit}>
            <div className="form-group">
                <label htmlFor="title">Task Title*</label>
                <input
                    type="text"
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="What needs to be done?"
                    required
                />
            </div>

            <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Additional details..."
                />
            </div>

            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="dueDate">Due Date</label>
                    <input
                        type="date"
                        id="dueDate"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="priority">Priority</label>
                    <select
                        id="priority"
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                    >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                    </select>
                </div>
            </div>

            <div className="prep-row">
                <label className="prep-toggle">
                    <input
                        type="checkbox"
                        checked={needsPrep}
                        onChange={(e) => setNeedsPrep(e.target.checked)}
                    />
                    Flag for prep time
                </label>
                {needsPrep && (
                    <label className="prep-hours">
                        <input
                            type="number"
                            min="0.5"
                            max="40"
                            step="0.5"
                            value={prepHours}
                            onChange={(e) => setPrepHours(e.target.value)}
                        />
                        hours of prep
                    </label>
                )}
            </div>

            <button type="submit" className="submit-btn">
                Add Task
            </button>
        </form>
    )
}

export default TaskForm
