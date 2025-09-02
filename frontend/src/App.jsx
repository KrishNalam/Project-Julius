import { useState } from 'react'
import TaskForm from './components/TaskForm/TaskForm'
import TaskList from './components/TaskList/TaskList'
import './App.scss'

function App() {
    const [tasks, setTasks] = useState([])

    const addTask = (task) => {
        setTasks([
            ...tasks,
            {
                id: Date.now(),
                ...task,
                completed: false,
            },
        ])
    }

    const toggleTask = (id) => {
        setTasks(
            tasks.map((task) =>
                task.id === id ? { ...task, completed: !task.completed } : task
            )
        )
    }

    const deleteTask = (id) => {
        setTasks(tasks.filter((task) => task.id !== id))
    }

    return (
        <div className="app">
            <header className="header">
                <h1>Project Julius</h1>
            </header>

            <div className="main-content">
                <div className="task-section">
                    <h2 className="section-title">Add New Task</h2>
                    <TaskForm onAddTask={addTask} />
                </div>

                <div className="task-section">
                    <h2 className="section-title">Your Tasks</h2>
                    <TaskList
                        tasks={tasks}
                        onToggleTask={toggleTask}
                        onDeleteTask={deleteTask}
                    />
                </div>
            </div>
        </div>
    )
}

export default App
