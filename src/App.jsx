import { useMemo, useState } from 'react'

const components = [
  { id: 'olt', name: 'OLT', subtitle: 'Puerto PON 0/1/1', icon: '◉', detail: 'Equipo de cabecera que origina la red PON.', value: '+4.0 dBm' },
  { id: 'odf', name: 'ODF', subtitle: 'Puerto 12', icon: '▦', detail: 'Distribuidor óptico de la central.', value: '-0.4 dB' },
  { id: 'mufa', name: 'Mufa', subtitle: 'MUFA-001', icon: '⬡', detail: 'Caja de empalme con buffers y bandejas.', value: '24 fibras' },
  { id: 'splitter', name: 'Splitter', subtitle: '1:8', icon: '⑧', detail: 'Divisor óptico pasivo.', value: '-10.5 dB' },
  { id: 'cto', name: 'CTO / NAP', subtitle: 'Puerto 04', icon: '▣', detail: 'Terminal de distribución hacia abonados.', value: '8 puertos' },
  { id: 'ont', name: 'ONT', subtitle: 'Cliente 001', icon: '⌂', detail: 'Terminal óptica instalada en casa del cliente.', value: '-18.7 dBm' },
]

const fiberColors = [
  ['Azul', '#2f80ed'],
  ['Naranja', '#f2994a'],
  ['Verde', '#27ae60'],
  ['Marrón', '#8d6e63'],
  ['Gris', '#9e9e9e'],
  ['Blanco', '#f5f5f5'],
  ['Rojo', '#eb5757'],
  ['Negro', '#222'],
  ['Amarillo', '#f2c94c'],
  ['Violeta', '#9b51e0'],
  ['Rosa', '#ff7eb6'],
  ['Aqua', '#56ccf2'],
]

function App() {
  const [selectedId, setSelectedId] = useState('mufa')
  const [showFibers, setShowFibers] = useState(true)
  const selected = useMemo(() => components.find((item) => item.id === selectedId), [selectedId])

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">LABORATORIO EDUCATIVO</p>
          <h1>Simulador FTTH</h1>
          <p className="muted">Aprende a seguir una fibra desde la OLT hasta la ONT.</p>
        </div>
        <div className="status-pill">● Red operativa</div>
      </header>

      <main className="layout">
        <section className="workspace">
          <div className="section-heading">
            <div>
              <span className="step">ESCENARIO 01</span>
              <h2>Ruta óptica principal</h2>
            </div>
            <button className="secondary-btn" onClick={() => setShowFibers((value) => !value)}>
              {showFibers ? 'Ocultar fibras' : 'Ver fibras'}
            </button>
          </div>

          <div className="network-flow" aria-label="Ruta FTTH">
            {components.map((item, index) => (
              <div className="flow-segment" key={item.id}>
                <button
                  className={selectedId === item.id ? 'node selected' : 'node'}
                  onClick={() => setSelectedId(item.id)}
                >
                  <span className="node-icon">{item.icon}</span>
                  <strong>{item.name}</strong>
                  <small>{item.subtitle}</small>
                </button>
                {index < components.length - 1 && (
                  <div className="fiber-link">
                    <span />
                    <small>fibra</small>
                  </div>
                )}
              </div>
            ))}
          </div>

          {showFibers && (
            <div className="fiber-panel">
              <div>
                <p className="eyebrow">CABLE DE PRÁCTICA</p>
                <h3>Buffer azul · 12 fibras</h3>
                <p className="muted">Esta será la base para los ejercicios de identificación y empalme.</p>
              </div>
              <div className="fiber-grid">
                {fiberColors.map(([name, color], index) => (
                  <button className="fiber-chip" key={name} title={name}>
                    <span className="fiber-dot" style={{ background: color }} />
                    <b>{String(index + 1).padStart(2, '0')}</b>
                    <span>{name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <aside className="inspector">
          <p className="eyebrow">INSPECTOR</p>
          <div className="inspector-icon">{selected.icon}</div>
          <h2>{selected.name}</h2>
          <p className="muted">{selected.subtitle}</p>

          <div className="metric">
            <span>Dato principal</span>
            <strong>{selected.value}</strong>
          </div>

          <div className="info-box">
            <strong>¿Qué es?</strong>
            <p>{selected.detail}</p>
          </div>

          {selected.id === 'mufa' && (
            <div className="info-box accent">
              <strong>Próximo módulo</strong>
              <p>Abrir la mufa, elegir bandeja, identificar buffer y realizar empalmes fibra por fibra.</p>
            </div>
          )}

          <div className="lesson">
            <span>Objetivo actual</span>
            <p>Haz clic en cada equipo y memoriza el orden físico de una red FTTH.</p>
          </div>
        </aside>
      </main>
    </div>
  )
}

export default App
