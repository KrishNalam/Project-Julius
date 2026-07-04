import { useEffect, useState } from 'react'
import { CalendarCheck, Loader2, RefreshCw, Unlink } from 'lucide-react'
import { apiFetch } from '../../api'
import './GoogleSync.scss'

const GoogleSync = () => {
    const [status, setStatus] = useState(null) // { configured, connected }
    const [busy, setBusy] = useState(false)
    const [message, setMessage] = useState(null)

    const loadStatus = async () => {
        try {
            setStatus(await apiFetch('/api/google/status'))
        } catch {
            setStatus(null)
        }
    }

    useEffect(() => {
        loadStatus()

        // Returning from the Google consent screen (?google=connected|denied|error)
        const params = new URLSearchParams(window.location.search)
        const result = params.get('google')
        if (result) {
            window.history.replaceState({}, '', window.location.pathname)
            if (result === 'connected') {
                setMessage('Google Calendar connected — your items are synced.')
            } else if (result === 'denied') {
                setMessage('Google connection was cancelled.')
            } else {
                setMessage('Google connection failed. Try again.')
            }
        }
    }, [])

    const connect = async () => {
        setBusy(true)
        setMessage(null)
        try {
            const { url } = await apiFetch('/api/google/auth-url')
            window.location.href = url
        } catch (err) {
            setMessage(err.message)
            setBusy(false)
        }
    }

    const syncNow = async () => {
        setBusy(true)
        setMessage(null)
        try {
            const { synced } = await apiFetch('/api/google/sync', { method: 'POST' })
            setMessage(`Synced ${synced} item${synced === 1 ? '' : 's'} to Google Calendar.`)
        } catch (err) {
            setMessage(err.message)
        } finally {
            setBusy(false)
        }
    }

    const disconnect = async () => {
        setBusy(true)
        setMessage(null)
        try {
            await apiFetch('/api/google/disconnect', { method: 'DELETE' })
            await loadStatus()
            setMessage('Google Calendar disconnected.')
        } catch (err) {
            setMessage(err.message)
        } finally {
            setBusy(false)
        }
    }

    if (!status) return null

    return (
        <div className="google-sync">
            {!status.configured ? (
                <span className="sync-note">
                    Google sync not configured — see backend/.env.example
                </span>
            ) : status.connected ? (
                <>
                    <span className="sync-connected">
                        <CalendarCheck size={16} />
                        Google Calendar connected
                    </span>
                    <button className="sync-btn" onClick={syncNow} disabled={busy}>
                        {busy ? (
                            <Loader2 size={16} className="spin" />
                        ) : (
                            <RefreshCw size={16} />
                        )}
                        Sync now
                    </button>
                    <button
                        className="sync-btn subtle"
                        onClick={disconnect}
                        disabled={busy}
                    >
                        <Unlink size={16} />
                        Disconnect
                    </button>
                </>
            ) : (
                <button className="sync-btn connect" onClick={connect} disabled={busy}>
                    {busy ? (
                        <Loader2 size={16} className="spin" />
                    ) : (
                        <CalendarCheck size={16} />
                    )}
                    Connect Google Calendar
                </button>
            )}
            {message && <span className="sync-message">{message}</span>}
        </div>
    )
}

export default GoogleSync
