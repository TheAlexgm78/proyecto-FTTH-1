import { useMemo, useState } from 'react'
import { calculateBudget } from './utils/opticalPower'

const fiberColors = [
  ['Azul', '#2f80ed'], ['Naranja', '#f2994a'], ['Verde', '#27ae60'], ['Marrón', '#8d6e63'],
  ['Gris', '#9e9e9e'], ['Blanco', '#f5f5f5'], ['Rojo', '#eb5757'], ['Negro', '#222'],
  ['Amarillo', '#f2c94c'], ['Violeta', '#9b51e0'], ['Rosa', '#ff7eb6'], ['Aqua', '#56ccf2'],
]

const buffers = [
  { id: 'azul', name: 'Buffer azul', color: '#2f80ed', range: 'Fibras 01–12' },
  { id: 'naranja', name: 'Buffer naranja', color: '#f2994a', range: 'Fibras 13–24' },
]

function NumberField({ label, value, onChange, step = '0.1', min = 0, suffix }) {
  return (
    <label className="control-field">
      <span>{label}</span>
      <div className="input-wrap">
        <input
          type="number"
          value={value}
          step={step}
          min={min}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {suffix && <small>{suffix}</small>}
      </div>
    </label>
  )
}

function FiberButton({ fiber, selected, onSelect, spliced }) {
  const [name, color] = fiber
  const number = fiberColors.findIndex((item) => item[0] === name) + 1
  return (
    <button className={`splice-fiber ${selected ? 'selected' : ''} ${spliced ? 'spliced' : ''}`} onClick={() => onSelect(number)}>
      <span className="fiber-line" style={{ backgroundColor: color }} />
      <span className="fiber-number">{String(number).padStart(2, '0')}</span>
      <span>{name}</span>
    </button>
  )
}

function App() {
  const [tab, setTab] = useState('power')
  const [budgetConfig, setBudgetConfig] = useState({
    txPowerDbm: 4,
    attenuationDbPerKm: 0.35,
    feederMeters: 1800,
    distributionMeters: 700,
    dropMeters: 120,
    splice1Db: 0.08,
    splice2Db: 0.08,
    connectorCount: 2,
    connectorLossDb: 0.3,
    splitterOutputs: 8,
    splitterExcessDb: 1,
  })

  const [bufferId, setBufferId] = useState('azul')
  const [inputFiber, setInputFiber] = useState(null)
  const [outputFiber, setOutputFiber] = useState(null)
  const [splices, setSplices] = useState([])
  const [message, setMessage] = useState('Objetivo: empalma la fibra 03 Verde con la fibra 03 Verde.')

  const budget = useMemo(() => calculateBudget(budgetConfig), [budgetConfig])
  const activeBuffer = buffers.find((buffer) => buffer.id === bufferId)

  const updateBudget = (key, value) => setBudgetConfig((current) => ({ ...current, [key]: value }))

  const makeSplice = () => {
    if (!inputFiber || !outputFiber) {
      setMessage('Selecciona una fibra de entrada y otra de salida.')
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
    setMessage(inputFiber === 3 && bufferId === 'azul'
      ? '✓ Correcto. Reparaste el hilo objetivo: Buffer azul, fibra 03 Verde.'
      : `✓ Empalme correcto: ${activeBuffer.name}, fibra ${String(inputFiber).padStart(2, '0')}.`)
    setInputFiber(null)
    setOutputFiber(null)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">LABORATORIO EDUCATIVO</p>
          <h1>Simulador FTTH</h1>
          <p className="muted">Diseña la ruta, calcula potencia y practica empalmes.</p>
        </div>
        <div className="status-pill">● Simulación activa</div>
      </header>

      <nav className="tabs">
        <button className={tab === 'power' ? 'tab active' : 'tab'} onClick={() => setTab('power')}>Presupuesto óptico</button>
        <button className={tab === 'splice' ? 'tab active' : 'tab'} onClick={() => setTab('splice')}>Mufa y empalmes</button>
      </nav>

      {tab === 'power' && (
        <main className="power-layout">
          <section className="workspace">
            <div className="section-heading">
              <div>
                <span className="step">ESCENARIO DE RED</span>
                <h2>Potencia desde la OLT hasta la ONT</h2>
                <p className="muted">Todos los valores son editables. El cálculo se actualiza automáticamente.</p>
              </div>
            </div>

            <div className="power-route">
              {budget.checkpoints.map((point, index) => (
                <div className="power-stage" key={point.id}>
                  <div className="stage-card">
                    <small>{point.label}</small>
                    <strong>{point.powerDbm.toFixed(2)} dBm</strong>
                    {point.lossDb > 0 && <span>−{point.lossDb.toFixed(2)} dB</span>}
                  </div>
                  {index < budget.checkpoints.length - 1 && <div className="route-arrow">→</div>}
                </div>
              ))}
            </div>

            <div className="summary-grid">
              <div className="summary-card">
                <span>Pérdida total</span>
                <strong>{budget.totalLossDb.toFixed(2)} dB</strong>
              </div>
              <div className="summary-card">
                <span>Potencia estimada en ONT</span>
                <strong>{budget.rxPowerDbm.toFixed(2)} dBm</strong>
              </div>
              <div className="summary-card">
                <span>Distancia total</span>
                <strong>{(budgetConfig.feederMeters + budgetConfig.distributionMeters + budgetConfig.dropMeters).toLocaleString()} m</strong>
              </div>
              <div className="summary-card">
                <span>Splitter</span>
                <strong>1:{budgetConfig.splitterOutputs}</strong>
              </div>
            </div>

            <div className="loss-table">
              <div><span>Feeder</span><b>{budgetConfig.feederMeters} m</b><strong>−{budget.losses.feeder.toFixed(2)} dB</strong></div>
              <div><span>Empalme 1</span><b>MUFA-001</b><strong>−{budget.losses.splice1.toFixed(2)} dB</strong></div>
              <div><span>Distribución</span><b>{budgetConfig.distributionMeters} m</b><strong>−{budget.losses.distribution.toFixed(2)} dB</strong></div>
              <div><span>Splitter</span><b>1:{budgetConfig.splitterOutputs}</b><strong>−{budget.losses.split.toFixed(2)} dB</strong></div>
              <div><span>Empalme 2</span><b>NAP / CTO</b><strong>−{budget.losses.splice2.toFixed(2)} dB</strong></div>
              <div><span>Drop</span><b>{budgetConfig.dropMeters} m</b><strong>−{budget.losses.drop.toFixed(2)} dB</strong></div>
              <div><span>Conectores</span><b>{budgetConfig.connectorCount} × {budgetConfig.connectorLossDb} dB</b><strong>−{budget.losses.connectorLoss.toFixed(2)} dB</strong></div>
            </div>
          </section>

          <aside className="inspector">
            <p className="eyebrow">PARÁMETROS</p>
            <h2>Configurar red</h2>
            <p className="muted">Pon aquí las distancias y pérdidas de tu escenario real.</p>

            <div className="form-grid">
              <NumberField label="Potencia OLT" value={budgetConfig.txPowerDbm} onChange={(v) => updateBudget('txPowerDbm', v)} step="0.1" min={-10} suffix="dBm" />
              <NumberField label="Atenuación fibra" value={budgetConfig.attenuationDbPerKm} onChange={(v) => updateBudget('attenuationDbPerKm', v)} step="0.01" suffix="dB/km" />
              <NumberField label="Feeder" value={budgetConfig.feederMeters} onChange={(v) => updateBudget('feederMeters', v)} step="10" suffix="m" />
              <NumberField label="Distribución" value={budgetConfig.distributionMeters} onChange={(v) => updateBudget('distributionMeters', v)} step="10" suffix="m" />
              <NumberField label="Drop cliente" value={budgetConfig.dropMeters} onChange={(v) => updateBudget('dropMeters', v)} step="10" suffix="m" />
              <NumberField label="Pérdida empalme 1" value={budgetConfig.splice1Db} onChange={(v) => updateBudget('splice1Db', v)} step="0.01" suffix="dB" />
              <NumberField label="Pérdida empalme 2" value={budgetConfig.splice2Db} onChange={(v) => updateBudget('splice2Db', v)} step="0.01" suffix="dB" />
              <NumberField label="Conectores" value={budgetConfig.connectorCount} onChange={(v) => updateBudget('connectorCount', v)} step="1" suffix="uds" />
              <NumberField label="Pérdida por conector" value={budgetConfig.connectorLossDb} onChange={(v) => updateBudget('connectorLossDb', v)} step="0.05" suffix="dB" />
              <NumberField label="Salidas del splitter" value={budgetConfig.splitterOutputs} onChange={(v) => updateBudget('splitterOutputs', Math.max(1, Math.round(v)))} step="1" suffix="salidas" />
              <NumberField label="Pérdida extra splitter" value={budgetConfig.splitterExcessDb} onChange={(v) => updateBudget('splitterExcessDb', v)} step="0.1" suffix="dB" />
            </div>

            <div className="info-box accent">
              <strong>Cómo calcula el splitter</strong>
              <p>Usa 10·log10(N) + pérdida extra. Esto permite probar 1:8, 1:6, 1:16 o cualquier cantidad de salidas.</p>
            </div>
          </aside>
        </main>
      )}

      {tab === 'splice' && (
        <main className="layout">
          <section className="workspace splice-workshop">
            <div className="workshop-head">
              <div>
                <p className="eyebrow">MUFA-001 · BANDEJA 01</p>
                <h2>Mesa de empalme</h2>
                <p className="muted">Selecciona el buffer y une el hilo correcto.</p>
              </div>
            </div>

            <div className="exercise-banner" aria-live="polite"><strong>Ejercicio:</strong> {message}</div>

            <div className="buffer-tabs">
              {buffers.map((buffer) => (
                <button key={buffer.id} className={bufferId === buffer.id ? 'buffer-tab active' : 'buffer-tab'} onClick={() => { setBufferId(buffer.id); setInputFiber(null); setOutputFiber(null) }}>
                  <span style={{ background: buffer.color }} /><b>{buffer.name}</b><small>{buffer.range}</small>
                </button>
              ))}
            </div>

            <div className="splice-board">
              <div className="cable-column">
                <div className="cable-title"><span>←</span><div><strong>Cable entrante</strong><small>Desde ODF</small></div></div>
                <div className="fiber-list">
                  {fiberColors.map((fiber, index) => <FiberButton key={fiber[0]} fiber={fiber} selected={inputFiber === index + 1} onSelect={setInputFiber} spliced={splices.includes(`${bufferId}-${index + 1}`)} />)}
                </div>
              </div>

              <div className="fusion-center">
                <div className="fusion-machine">⚡<strong>Fusionadora</strong><small>Bandeja 01</small></div>
                <div className="selection-summary">
                  <span>Entrada: <b>{inputFiber ? String(inputFiber).padStart(2, '0') : '—'}</b></span>
                  <span>Salida: <b>{outputFiber ? String(outputFiber).padStart(2, '0') : '—'}</b></span>
                </div>
                <button className="primary-btn" onClick={makeSplice}>Realizar empalme</button>
              </div>

              <div className="cable-column">
                <div className="cable-title right"><div><strong>Cable saliente</strong><small>Hacia splitter</small></div><span>→</span></div>
                <div className="fiber-list">
                  {fiberColors.map((fiber, index) => <FiberButton key={fiber[0]} fiber={fiber} selected={outputFiber === index + 1} onSelect={setOutputFiber} spliced={splices.includes(`${bufferId}-${index + 1}`)} />)}
                </div>
              </div>
            </div>
          </section>

          <aside className="inspector">
            <p className="eyebrow">ESTADO</p>
            <h2>Empalmes</h2>
            <div className="metric"><span>Correctos</span><strong>{splices.length}</strong></div>
            <div className="info-box"><strong>{activeBuffer.name}</strong><p>{activeBuffer.range}</p></div>
          </aside>
        </main>
      )}
    </div>
  )
}

export default App
