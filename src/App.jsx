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
  ['Azul', '#2f80ed'], ['Naranja', '#f2994a'], ['Verde', '#27ae60'], ['Marrón', '#8d6e63'],
  ['Gris', '#9e9e9e'], ['Blanco', '#f5f5f5'], ['Rojo', '#eb5757'], ['Negro', '#222'],
  ['Amarillo', '#f2c94c'], ['Violeta', '#9b51e0'], ['Rosa', '#ff7eb6'], ['Aqua', '#56ccf2'],
]

const buffers = [
  { id: 'azul', name: 'Buffer azul', color: '#2f80ed', range: 'Fibras 01–12' },
  { id: 'naranja', name: 'Buffer naranja', color: '#f2994a', range: 'Fibras 13–24' },
]

function FiberButton({ fiber, side, selected, onSelect, spliced }) {
  const [name, color] = fiber
  const number = fiberColors.findIndex((item) => item[0] === name) + 1
  return (
    <button
      className={`splice-fiber ${selected ? 'selected' : ''} ${spliced ? 'spliced' : ''}`}
      onClick={() => onSelect(number)}
      type="button"
    >
      <span className="fiber-line" style={{ backgroundColor: color }} />
      <span className="fiber-number">{String(number).padStart(2, '0')}</span>
      <span>{name}</span>
      <small>{side}</small>
    </button>
  )
}

function App() {
  const [selectedId, setSelectedId] = useState('mufa')
  const [showFibers, setShowFibers] = useState(true)
  const [mufaOpen, setMufaOpen] = useState(false)
  const [bufferId, setBufferId] = useState('azul')
  const [inputFiber, setInputFiber] = useState(null)
  const [outputFiber, setOutputFiber] = useState(null)
  const [splices, setSplices] = useState([])
  const [message, setMessage] = useState('Objetivo: empalma la fibra 03 Verde con la fibra 03 Verde.')
  const selected = useMemo(() => components.find((item) => item.id === selectedId), [selectedId])
  const activeBuffer = buffers.find((buffer) => buffer.id === bufferId)

  const chooseComponent = (id) => {
    setSelectedId(id)
    if (id !== 'mufa') setMufaOpen(false)
  }

  const makeSplice = () => {
    if (!inputFiber || !outputFiber) {
      setMessage('Selecciona una fibra del cable entrante y otra del cable saliente.')
      return
    }

    if (inputFiber !== outputFiber) {
      setMessage(`⚠ Empalme incorrecto: fibra ${String(inputFiber).padStart(2, '0')} no corresponde con fibra ${String(outputFiber).padStart(2, '0')}.`)
      return
    }

    const key = `${bufferId}-${inputFiber}`
    if (splices.includes(key)) {
      setMessage('Ese hilo ya está empalmado.')
      return
    }

    setSplices((current) => [...current, key])
    setMessage(
      inputFiber === 3 && bufferId === 'azul'
        ? '✓ Correcto. Reparaste el hilo objetivo: Buffer azul, fibra 03 Verde.'
        : `✓ Empalme correcto: ${activeBuffer.name}, fibra ${String(inputFiber).padStart(2, '0')}.`
    )
    setInputFiber(null)
    setOutputFiber(null)
  }

  const resetWorkshop = () => {
    setInputFiber(null)
    setOutputFiber(null)
    setSplices([])
    setBufferId('azul')
    setMessage('Objetivo: empalma la fibra 03 Verde con la fibra 03 Verde.')
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">LABORATORIO EDUCATIVO</p>
          <h1>Simulador FTTH</h1>
          <p className="muted">Aprende a seguir, empalmar y diagnosticar una fibra desde la OLT hasta la ONT.</p>
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
                  onClick={() => chooseComponent(item.id)}
                >
                  <span className="node-icon">{item.icon}</span>
                  <strong>{item.name}</strong>
                  <small>{item.subtitle}</small>
                </button>
                {index < components.length - 1 && <div className="fiber-link"><span /><small>fibra</small></div>}
              </div>
            ))}
          </div>

          {selectedId === 'mufa' && mufaOpen ? (
            <section className="splice-workshop">
              <div className="workshop-head">
                <div>
                  <p className="eyebrow">MUFA-001 · BANDEJA 01</p>
                  <h2>Mesa de empalme</h2>
                  <p className="muted">Selecciona el buffer y une el hilo correcto del cable entrante con el saliente.</p>
                </div>
                <div className="workshop-actions">
                  <button className="secondary-btn" onClick={resetWorkshop}>Reiniciar</button>
                  <button className="secondary-btn" onClick={() => setMufaOpen(false)}>Cerrar mufa</button>
                </div>
              </div>

              <div className="exercise-banner" aria-live="polite">
                <strong>Ejercicio:</strong> {message}
              </div>

              <div className="buffer-tabs">
                {buffers.map((buffer) => (
                  <button
                    key={buffer.id}
                    className={bufferId === buffer.id ? 'buffer-tab active' : 'buffer-tab'}
                    onClick={() => {
                      setBufferId(buffer.id)
                      setInputFiber(null)
                      setOutputFiber(null)
                    }}
                  >
                    <span style={{ background: buffer.color }} />
                    <b>{buffer.name}</b>
                    <small>{buffer.range}</small>
                  </button>
                ))}
              </div>

              <div className="splice-board">
                <div className="cable-column">
                  <div className="cable-title"><span>←</span><div><strong>Cable entrante</strong><small>Desde ODF</small></div></div>
                  <div className="fiber-list">
                    {fiberColors.map((fiber, index) => (
                      <FiberButton
                        key={fiber[0]}
                        fiber={fiber}
                        side="Entrada"
                        selected={inputFiber === index + 1}
                        onSelect={setInputFiber}
                        spliced={splices.includes(`${bufferId}-${index + 1}`)}
                      />
                    ))}
                  </div>
                </div>

                <div className="fusion-center">
                  <div className="fusion-machine">⚡<strong>Fusionadora</strong><small>Bandeja 01</small></div>
                  <div className="selection-summary">
                    <span>Entrada: <b>{inputFiber ? String(inputFiber).padStart(2, '0') : '—'}</b></span>
                    <span>Salida: <b>{outputFiber ? String(outputFiber).padStart(2, '0') : '—'}</b></span>
                  </div>
                  <button className="primary-btn" onClick={makeSplice}>Realizar empalme</button>
                  <small className="muted">{splices.length} empalme(s) correcto(s)</small>
                </div>

                <div className="cable-column">
                  <div className="cable-title right"><div><strong>Cable saliente</strong><small>Hacia splitter</small></div><span>→</span></div>
                  <div className="fiber-list">
                    {fiberColors.map((fiber, index) => (
                      <FiberButton
                        key={fiber[0]}
                        fiber={fiber}
                        side="Salida"
                        selected={outputFiber === index + 1}
                        onSelect={setOutputFiber}
                        spliced={splices.includes(`${bufferId}-${index + 1}`)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </section>
          ) : showFibers && (
            <div className="fiber-panel">
              <div>
                <p className="eyebrow">CABLE DE PRÁCTICA</p>
                <h3>2 buffers · 24 fibras</h3>
                <p className="muted">Selecciona la Mufa y pulsa “Abrir mufa” para practicar empalmes.</p>
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

          <div className="metric"><span>Dato principal</span><strong>{selected.value}</strong></div>
          <div className="info-box"><strong>¿Qué es?</strong><p>{selected.detail}</p></div>

          {selected.id === 'mufa' && (
            <>
              <div className="info-box accent">
                <strong>MUFA-001</strong>
                <p>2 buffers de 12 hilos. Bandeja 01 preparada para prácticas de continuidad y reparación.</p>
              </div>
              <button className="primary-btn full" onClick={() => setMufaOpen(true)}>Abrir mufa</button>
            </>
          )}

          <div className="lesson">
            <span>Objetivo actual</span>
            <p>{selected.id === 'mufa' ? 'Abre la mufa y completa el primer empalme guiado.' : 'Haz clic en los equipos para recorrer la red FTTH.'}</p>
          </div>
        </aside>
      </main>
    </div>
  )
}

export default App
