import { useEffect, useState } from 'react'
import Simulator from './features/simulator/Simulator'
import MapWorkspace from './features/map/MapWorkspace'
import { api, getToken, setToken } from './services/api'

function AuthScreen({ onAuthenticated }) {
  const [mode, setMode] = useState('login')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setBusy(true)

    try {
      const data = mode === 'register'
        ? await api.register(displayName, email, password)
        : await api.login(email, password)

      setToken(data.token)
      onAuthenticated(data.user)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-shell">
      <section className="auth-brand">
        <div className="brand-row">
          <span className="brand-mark">FTTH</span>
          <span className="eyebrow">NETWORK MANAGER</span>
        </div>
        <h1>Planifica, documenta y supervisa tu red de fibra.</h1>
        <p>
          Un solo sistema para proyectos FTTH, potencia óptica, mufas, splitters,
          NAP, clientes y próximamente el mapa GIS.
        </p>
        <div className="auth-feature-grid">
          <div><b>01</b><span>Presupuesto óptico</span></div>
          <div><b>02</b><span>Inventario de red</span></div>
          <div><b>03</b><span>PostGIS y mapas</span></div>
        </div>
      </section>

      <section className="auth-card panel">
        <p className="eyebrow">{mode === 'login' ? 'INICIAR SESIÓN' : 'CREAR CUENTA'}</p>
        <h2>{mode === 'login' ? 'Bienvenido' : 'Nuevo usuario'}</h2>
        <p className="muted">
          {mode === 'login'
            ? 'Entra a tus proyectos FTTH.'
            : 'Crea tu cuenta local para administrar proyectos.'}
        </p>

        <form onSubmit={submit}>
          {mode === 'register' && (
            <label className="field">
              <span>Nombre</span>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
            </label>
          )}
          <label className="field">
            <span>Correo</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="field">
            <span>Contraseña</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength="8" required />
          </label>

          {error && <div className="form-error">{error}</div>}

          <button className="primary-btn full auth-submit" disabled={busy}>
            {busy ? 'Procesando…' : mode === 'login' ? 'Entrar al sistema' : 'Crear cuenta'}
          </button>
        </form>

        <button
          className="text-btn"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login')
            setError('')
          }}
        >
          {mode === 'login' ? '¿No tienes cuenta? Crear usuario' : 'Ya tengo cuenta'}
        </button>
      </section>
    </div>
  )
}

function ProjectWorkspace({ project, onBack }) {
  const [view, setView] = useState('map')

  if (view === 'simulator') {
    return <Simulator project={project} onBack={() => setView('map')} />
  }

  return (
    <MapWorkspace
      project={project}
      onBack={onBack}
      onOpenSimulator={() => setView('simulator')}
    />
  )
}

function Dashboard({ user, onLogout, onOpenProject }) {
  const [projects, setProjects] = useState([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(true)
  const [creating, setCreating] = useState(false)

  const loadProjects = async () => {
    setBusy(true)
    setError('')
    try {
      const data = await api.listProjects()
      setProjects(data.projects)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    loadProjects()
  }, [])

  const createProject = async (event) => {
    event.preventDefault()
    setCreating(true)
    setError('')
    try {
      const data = await api.createProject(name, description)
      setProjects((current) => [data.project, ...current])
      setName('')
      setDescription('')
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="system-shell">
      <header className="system-topbar">
        <div>
          <div className="brand-row">
            <span className="brand-mark">FTTH</span>
            <span className="eyebrow">NETWORK MANAGER</span>
          </div>
          <h1>Mis proyectos</h1>
          <p className="muted">Administra tus redes, mapas, cables y simulación óptica por proyecto.</p>
        </div>
        <div className="user-box">
          <div><strong>{user.displayName}</strong><small>{user.email}</small></div>
          <button className="back-btn" onClick={onLogout}>Cerrar sesión</button>
        </div>
      </header>

      <main className="dashboard-grid">
        <section className="project-list">
          <div className="section-title-row">
            <div>
              <p className="eyebrow">PROYECTOS</p>
              <h2>Redes FTTH</h2>
            </div>
            <span className="project-count">{projects.length}</span>
          </div>

          {error && <div className="form-error">{error}</div>}

          {busy ? (
            <div className="empty-card panel">Cargando proyectos…</div>
          ) : projects.length === 0 ? (
            <div className="empty-card panel">
              <strong>Aún no tienes proyectos.</strong>
              <span>Crea el primero desde el panel de la derecha.</span>
            </div>
          ) : (
            <div className="project-grid">
              {projects.map((project) => (
                <button className="project-card panel" key={project.id} onClick={() => onOpenProject(project)}>
                  <div className="project-card-icon">⌁</div>
                  <div>
                    <small>PROYECTO #{project.id}</small>
                    <h3>{project.name}</h3>
                    <p>{project.description || 'Sin descripción'}</p>
                  </div>
                  <span className="open-project">Abrir →</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <aside className="create-project panel">
          <p className="eyebrow">NUEVO PROYECTO</p>
          <h2>Crear red</h2>
          <p className="muted">El proyecto quedará guardado en PostgreSQL.</p>

          <form onSubmit={createProject}>
            <label className="field">
              <span>Nombre</span>
              <input
                placeholder="Ej. Red FTTH Zona Norte"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>Descripción</span>
              <textarea
                rows="5"
                placeholder="Descripción del proyecto..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <button className="primary-btn full" disabled={creating}>
              {creating ? 'Creando…' : '+ Crear proyecto'}
            </button>
          </form>
        </aside>
      </main>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [checkingSession, setCheckingSession] = useState(Boolean(getToken()))
  const [activeProject, setActiveProject] = useState(null)

  useEffect(() => {
    if (!getToken()) return

    api.me()
      .then((data) => setUser(data.user))
      .catch(() => setToken(null))
      .finally(() => setCheckingSession(false))
  }, [])

  const logout = () => {
    setToken(null)
    setUser(null)
    setActiveProject(null)
  }

  if (checkingSession) {
    return <div className="splash-screen">Cargando FTTH Network Manager…</div>
  }

  if (!user) {
    return <AuthScreen onAuthenticated={setUser} />
  }

  if (activeProject) {
    return <ProjectWorkspace project={activeProject} onBack={() => setActiveProject(null)} />
  }

  return (
    <Dashboard
      user={user}
      onLogout={logout}
      onOpenProject={setActiveProject}
    />
  )
}
