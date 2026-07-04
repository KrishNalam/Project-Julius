// Thin API client — owns the auth token and JSON plumbing

const TOKEN_KEY = 'julius-token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

export class ApiError extends Error {
    constructor(message, status) {
        super(message)
        this.status = status
    }
}

export const apiFetch = async (path, { body, formData, ...options } = {}) => {
    const headers = {}
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
    if (body) headers['Content-Type'] = 'application/json'

    const res = await fetch(path, {
        ...options,
        headers,
        body: formData ?? (body ? JSON.stringify(body) : undefined),
    })

    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
        throw new ApiError(data.error || `Request failed (${res.status})`, res.status)
    }
    return data
}

// Mongo documents use _id; the UI keys everything on id
export const withId = (item) => ({ ...item, id: item._id })
