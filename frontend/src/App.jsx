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

    const exportToCalendar = () => {
        // Simple implementation - in a real app, this would use the Google Calendar API
        const calendarEvents = tasks
            .filter((task) => task.dueDate && !task.completed)
            .map((task) => {
                const startDate = new Date(task.dueDate)
                const endDate = new Date(startDate)
                endDate.setHours(endDate.getHours() + 1) // 1 hour event

                return {
                    title: task.title,
                    start: startDate.toISOString().replace(/-|:|\.\d+/g, ''),
                    end: endDate.toISOString().replace(/-|:|\.\d+/g, ''),
                    details: `Priority: ${task.priority}`,
                }
            })

        if (calendarEvents.length === 0) {
            alert('No tasks with due dates to export!')
            return
        }

        // Create a downloadable ICS file
        let icsContent =
            'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//hacksw/handcal//NONSGML v1.0//EN\n'

        calendarEvents.forEach((event) => {
            icsContent += `BEGIN:VEVENT\n`
            icsContent += `UID:${Date.now()}@taskflow\n`
            icsContent += `DTSTAMP:${new Date()
                .toISOString()
                .replace(/-|:|\.\d+/g, '')}\n`
            icsContent += `DTSTART:${event.start}\n`
            icsContent += `DTEND:${event.end}\n`
            icsContent += `SUMMARY:${event.title}\n`
            icsContent += `DESCRIPTION:${event.details}\n`
            icsContent += `END:VEVENT\n`
        })

        icsContent += 'END:VCALENDAR'

        // Download the file
        const blob = new Blob([icsContent], {
            type: 'text/calendar;charset=utf-8',
        })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = 'taskflow-tasks.ics'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        alert(
            `${calendarEvents.length} task(s) exported. You can import this ICS file into Google Calendar.`
        )
    }

    return (
        <div className="app">
            <header className="header">
                <h1>TaskFlow</h1>
                <p>Simple task management with calendar integration</p>
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
                        onExportToCalendar={exportToCalendar}
                    />
                </div>
            </div>
        </div>
    )
}

export default App
