import { useCallback, useEffect, useState } from 'react'
import {
    CalendarDays,
    CalendarClock,
    FileText,
    ListTodo,
    Loader2,
    LogOut,
} from 'lucide-react'
import TaskForm from './components/TaskForm/TaskForm'
import TaskList from './components/TaskList/TaskList'
import Calendar from './components/Calendar/Calendar'
import Documents from './components/Documents/Documents'
import Planner from './components/Planner/Planner'
import Auth from './components/Auth/Auth'
import GoogleSync from './components/GoogleSync/GoogleSync'
import { apiFetch, clearToken, getToken, withId } from './api'
import './App.scss'

// One-time migration of pre-account localStorage data into the user's account
const migrateLocalData = async () => {
    let localTasks = []
    let localEvents = []
    try {
        localTasks = JSON.parse(localStorage.getItem('julius-tasks')) ?? []
        localEvents = JSON.parse(localStorage.getItem('julius-events')) ?? []
    } catch {
        /* corrupted local data — nothing to migrate */
    }

    for (const task of localTasks) {
        await apiFetch('/api/tasks', { method: 'POST', body: task }).catch(() => {})
    }
    if (localEvents.length > 0) {
        await apiFetch('/api/events/bulk', {
            method: 'POST',
            body: { events: localEvents },
        }).catch(() => {})
    }
    localStorage.removeItem('julius-tasks')
    localStorage.removeItem('julius-events')
}

function App() {
    const [user, setUser] = useState(null)
    const [checking, setChecking] = useState(true)
    const [tasks, setTasks] = useState([])
    const [events, setEvents] = useState([])
    const [rules, setRules] = useState([])
    const [prepSlots, setPrepSlots] = useState([])
    const [warnings, setWarnings] = useState([])
    const [view, setView] = useState('tasks')

    // The plan is regenerated server-side after every change — refetch it
    const refreshPlan = useCallback(async () => {
        const { slots, warnings: planWarnings } = await apiFetch('/api/planner')
        setPrepSlots(slots.map(withId))
        setWarnings(planWarnings)
    }, [])

    const loadData = useCallback(async () => {
        const [taskData, eventData, ruleData] = await Promise.all([
            apiFetch('/api/tasks'),
            apiFetch('/api/events'),
            apiFetch('/api/rules'),
        ])
        setTasks(taskData.map(withId))
        setEvents(eventData.map(withId))
        setRules(ruleData.map(withId))
        await refreshPlan()
    }, [refreshPlan])

    // Restore session on load
    useEffect(() => {
        const restore = async () => {
            if (!getToken()) {
                setChecking(false)
                return
            }
            try {
                const { user: me } = await apiFetch('/api/auth/me')
                setUser(me)
                await loadData()
            } catch {
                clearToken()
            } finally {
                setChecking(false)
            }
        }
        restore()
    }, [loadData])

    const handleAuthed = async (authedUser) => {
        setUser(authedUser)
        await migrateLocalData()
        await loadData()
    }

    const logout = () => {
        clearToken()
        setUser(null)
        setTasks([])
        setEvents([])
        setRules([])
        setPrepSlots([])
        setWarnings([])
        setView('tasks')
    }

    const addTask = async (task) => {
        const created = await apiFetch('/api/tasks', { method: 'POST', body: task })
        setTasks((prev) => [...prev, withId(created)])
        await refreshPlan()
    }

    const toggleTask = async (id) => {
        const task = tasks.find((t) => t.id === id)
        const updated = await apiFetch(`/api/tasks/${id}`, {
            method: 'PATCH',
            body: { completed: !task.completed },
        })
        setTasks((prev) => prev.map((t) => (t.id === id ? withId(updated) : t)))
        await refreshPlan()
    }

    const toggleTaskFlag = async (task) => {
        const updated = await apiFetch(`/api/tasks/${task.id}`, {
            method: 'PATCH',
            body: { needsPrep: !task.needsPrep },
        })
        setTasks((prev) =>
            prev.map((t) => (t.id === task.id ? withId(updated) : t))
        )
        await refreshPlan()
    }

    const deleteTask = async (id) => {
        await apiFetch(`/api/tasks/${id}`, { method: 'DELETE' })
        setTasks((prev) => prev.filter((t) => t.id !== id))
        await refreshPlan()
    }

    const addEvents = async (newEvents) => {
        const created = await apiFetch('/api/events/bulk', {
            method: 'POST',
            body: { events: newEvents },
        })
        setEvents((prev) => [...prev, ...created.map(withId)])
        await refreshPlan()
    }

    const toggleEventFlag = async (event) => {
        const updated = await apiFetch(`/api/events/${event.id}`, {
            method: 'PATCH',
            body: { needsPrep: !event.needsPrep },
        })
        setEvents((prev) =>
            prev.map((e) => (e.id === event.id ? withId(updated) : e))
        )
        await refreshPlan()
    }

    const deleteEvent = async (id) => {
        await apiFetch(`/api/events/${id}`, { method: 'DELETE' })
        setEvents((prev) => prev.filter((e) => e.id !== id))
        await refreshPlan()
    }

    const deleteDocument = async (source) => {
        await apiFetch(`/api/events/by-source/${encodeURIComponent(source)}`, {
            method: 'DELETE',
        })
        setEvents((prev) => prev.filter((e) => e.source !== source))
        await refreshPlan()
    }

    const addRule = async (rule) => {
        const created = await apiFetch('/api/rules', {
            method: 'POST',
            body: rule,
        })
        setRules((prev) => [...prev, withId(created)])
        await refreshPlan()
    }

    const deleteRule = async (id) => {
        await apiFetch(`/api/rules/${id}`, { method: 'DELETE' })
        setRules((prev) => prev.filter((r) => r.id !== id))
        await refreshPlan()
    }

    if (checking) {
        return (
            <div className="app-loading">
                <Loader2 size={32} className="spin" />
            </div>
        )
    }

    if (!user) {
        return <Auth onAuthed={handleAuthed} />
    }

    return (
        <div className="app">
            <header className="header">
                <h1>Project Julius</h1>
                <nav className="nav">
                    <button
                        className={`nav-btn ${view === 'tasks' ? 'active' : ''}`}
                        onClick={() => setView('tasks')}
                    >
                        <ListTodo size={18} />
                        Tasks
                    </button>
                    <button
                        className={`nav-btn ${view === 'calendar' ? 'active' : ''}`}
                        onClick={() => setView('calendar')}
                    >
                        <CalendarDays size={18} />
                        Calendar
                    </button>
                    <button
                        className={`nav-btn ${view === 'documents' ? 'active' : ''}`}
                        onClick={() => setView('documents')}
                    >
                        <FileText size={18} />
                        Documents
                    </button>
                    <button
                        className={`nav-btn ${view === 'planner' ? 'active' : ''}`}
                        onClick={() => setView('planner')}
                    >
                        <CalendarClock size={18} />
                        Planner
                    </button>
                    <div className="user-menu">
                        <span className="user-email">{user.email}</span>
                        <button
                            className="nav-btn"
                            onClick={logout}
                            title="Sign out"
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </nav>
            </header>

            {view === 'tasks' && (
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
                            onToggleFlag={toggleTaskFlag}
                        />
                    </div>
                </div>
            )}

            {view === 'calendar' && (
                <>
                    <GoogleSync />
                    <Calendar
                        tasks={tasks}
                        events={events}
                        prepSlots={prepSlots}
                        onAddTask={addTask}
                        onToggleTask={toggleTask}
                        onDeleteTask={deleteTask}
                        onDeleteEvent={deleteEvent}
                    />
                </>
            )}

            {view === 'documents' && (
                <Documents
                    events={events}
                    onAddEvents={addEvents}
                    onDeleteEvent={deleteEvent}
                    onDeleteDocument={deleteDocument}
                    onToggleEventFlag={toggleEventFlag}
                />
            )}

            {view === 'planner' && (
                <Planner
                    rules={rules}
                    slots={prepSlots}
                    warnings={warnings}
                    onAddRule={addRule}
                    onDeleteRule={deleteRule}
                />
            )}
        </div>
    )
}

export default App
