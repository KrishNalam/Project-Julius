import { useState } from 'react'
import './TaskForm.scss'

const TaskForm = ({ onAddTask }) => {
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [dueDate, setDueDate] = useState('')

    const handleSubmit = (e) => {
        e.preventDefault()
        if (!title.trim()) return

        onAddTask({
            title: title.trim(),
            description: description.trim(),
            dueDate,
        })

        // Reset form
        setTitle('')
        setDescription('')
        setDueDate('')
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

            <div className="form-group">
                <label htmlFor="dueDate">Due Date</label>
                <input
                    type="date"
                    id="dueDate"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                />
            </div>

            <button type="submit" className="submit-btn">
                Add Task
            </button>
        </form>
    )
}

export default TaskForm
