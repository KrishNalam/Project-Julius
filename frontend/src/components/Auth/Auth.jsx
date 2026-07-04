import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { apiFetch, setToken } from '../../api'
import './Auth.scss'

const Auth = ({ onAuthed }) => {
    const [mode, setMode] = useState('login') // 'login' | 'register'
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState(null)
    const [busy, setBusy] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setBusy(true)
        setError(null)
        try {
            const { token, user } = await apiFetch(`/api/auth/${mode}`, {
                method: 'POST',
                body: { email, password },
            })
            setToken(token)
            onAuthed(user)
        } catch (err) {
            setError(
                err.message === 'Failed to fetch'
                    ? 'Could not reach the backend. Is it running?'
                    : err.message
            )
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h1 className="auth-brand">Project Julius</h1>
                <p className="auth-subtitle">
                    {mode === 'login'
                        ? 'Sign in to your tasks and calendar'
                        : 'Create an account to get started'}
                </p>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={
                                mode === 'register'
                                    ? 'At least 8 characters'
                                    : '••••••••'
                            }
                            minLength={mode === 'register' ? 8 : undefined}
                            required
                        />
                    </div>

                    {error && <p className="auth-error">{error}</p>}

                    <button type="submit" className="submit-btn" disabled={busy}>
                        {busy ? (
                            <Loader2 size={18} className="spin" />
                        ) : mode === 'login' ? (
                            'Sign In'
                        ) : (
                            'Create Account'
                        )}
                    </button>
                </form>

                <p className="auth-switch">
                    {mode === 'login' ? (
                        <>
                            New here?{' '}
                            <button onClick={() => setMode('register')}>
                                Create an account
                            </button>
                        </>
                    ) : (
                        <>
                            Already have an account?{' '}
                            <button onClick={() => setMode('login')}>
                                Sign in
                            </button>
                        </>
                    )}
                </p>
            </div>
        </div>
    )
}

export default Auth
