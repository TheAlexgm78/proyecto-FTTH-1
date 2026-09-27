const API_BASE = 'http://localhost:3001/api'
const TOKEN_KEY = 'ftth-auth-token'

export function getToken() {
  return window.localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  if (token) window.localStorage.setItem(TOKEN_KEY, token)
  else window.localStorage.removeItem(TOKEN_KEY)
}

async function request(path, options = {}) {
  const token = getToken()
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })

  let data
  try {
    data = await response.json()
  } catch {
    data = { ok: false, error: 'Respuesta inválida del servidor.' }
  }

  if (!response.ok) {
    const error = new Error(data.error || 'Error de servidor')
    error.status = response.status
    throw error
  }

  return data
}

export const api = {
  health: () => request('/health'),
  me: () => request('/auth/me'),
  login: (email, password) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }),
  register: (displayName, email, password) => request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ displayName, email, password }),
  }),
  listProjects: () => request('/projects'),
  createProject: (name, description) => request('/projects', {
    method: 'POST',
    body: JSON.stringify({ name, description }),
  }),
  getNetwork: (projectId) => request(`/projects/${projectId}/network`),
  createNode: (projectId, payload) => request(`/projects/${projectId}/nodes`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateNode: (projectId, nodeId, payload) => request(`/projects/${projectId}/nodes/${nodeId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),
  deleteNode: (projectId, nodeId) => request(`/projects/${projectId}/nodes/${nodeId}`, {
    method: 'DELETE',
  }),
  createLink: (projectId, payload) => request(`/projects/${projectId}/links`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  deleteLink: (projectId, linkId) => request(`/projects/${projectId}/links/${linkId}`, {
    method: 'DELETE',
  }),
}
