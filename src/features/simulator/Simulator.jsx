import { useEffect, useMemo, useRef, useState } from 'react'
import { calculateDynamicRoute } from '../../utils/opticalPower'

const typeMeta = {
  olt: { label: 'OLT', icon: '◉', defaultLoss: 0 },
  odf: { label: 'ODF', icon: '▦', defaultLoss: 0.3 },
  mufa: { label: 'Mufa', icon: '⬡', defaultLoss: 0.08 },
  splitter: { label: 'Splitter', icon: '⑧', defaultLoss: 0 },
  nap: { label: 'NAP / CTO', icon: '▣', defaultLoss: 0.08 },
  ont: { label: 'ONT', icon: '⌂', defaultLoss: 0.3 },
}

const starterNodes = [
  { id: 'olt-1', type: 'olt', name: 'OLT Central', txPowerDbm: 4.5, distanceFromPrevious: 0 },
  { id: 'odf-1', type: 'odf', name: 'ODF Puerto 17', lossDb: 0.3, distanceFromPrevious: 20 },
  { id: 'mufa-1', type: 'mufa', name: 'MUFA-001', lossDb: 0.08, distanceFromPrevious: 1850 },
  { id: 'splitter-1', type: 'splitter', name: 'Splitter principal', outputs: 8, excessLossDb: 1, distanceFromPrevious: 430 },
  { id: 'nap-1', type: 'nap', name: 'NAP-015', lossDb: 0.08, distanceFromPrevious: 670 },
  { id: 'ont-1', type: 'ont', name: 'ONT Cliente 001', lossDb: 0.3, distanceFromPrevious: 85 },
]

const storageKeyForProject = (projectId) => `ftth-network-project-${projectId || 'local'}`

function getInitialProject(storageKey) {
  if (typeof window === 'undefined') {
    return { nodes: starterNodes, attenuation: 0.35, selectedId: 'mufa-1' }
  }

  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) return { nodes: starterNodes, attenuation: 0.35, selectedId: 'mufa-1' }

    const saved = JSON.parse(raw)
    const validNodes = Array.isArray(saved.nodes) && saved.nodes.length >= 2
    if (!validNodes) throw new Error('Proyecto guardado inválido')

    return {
      nodes: saved.nodes,
      attenuation: Number.isFinite(Number(saved.attenuation)) ? Number(saved.attenuation) : 0.35,
      selectedId: saved.selectedId || saved.nodes[0]?.id,
    }
  } catch (error) {
    console.warn('No se pudo cargar el proyecto guardado.', error)
    return { nodes: starterNodes, attenuation: 0.35, selectedId: 'mufa-1' }
  }
}

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function NodeIcon({ type }) {
  return <span className="node-symbol">{typeMeta[type]?.icon || '•'}</span>
}

function NodeEditor({ node, onChange, onDelete, isFirst, isLast }) {
  const meta = typeMeta[node.type] || typeMeta.mufa
  return (
    <div className="editor-card">
      <div className="editor-card-head">
        <div className="editor-title">
          <NodeIcon type={node.type} />
          <div>
            <strong>{meta.label}</strong>
            <small>{node.name}</small>
          </div>
        </div>
        {!isFirst && !isLast && (
          <button className="icon-btn danger" onClick={onDelete} title="Eliminar nodo">×</button>
        )}
      </div>

      <label className="field">
        <span>Nombre</span>
        <input value={node.name} onChange={(e) => onChange({ name: e.target.value })} />
      </label>

      {!isFirst && (
        <label className="field">
          <span>Distancia desde el punto anterior</span>
          <div className="input-suffix">
            <input type="number" min="0" step="10" value={node.distanceFromPrevious} onChange={(e) => onChange({ distanceFromPrevious: Number(e.target.value) })} />
            <b>m</b>
          </div>
        </label>
      )}

      {node.type === 'olt' && (
        <label className="field">
          <span>Potencia TX</span>
          <div className="input-suffix">
            <input type="number" step="0.1" value={node.txPowerDbm} onChange={(e) => onChange({ txPowerDbm: Number(e.target.value) })} />
            <b>dBm</b>
          </div>
        </label>
      )}

      {node.type === 'splitter' ? (
        <div className="two-fields">
          <label className="field">
            <span>Salidas</span>
            <input type="number" min="2" step="1" value={node.outputs} onChange={(e) => onChange({ outputs: Math.max(2, Number(e.target.value)) })} />
          </label>
          <label className="field">
            <span>Pérdida extra</span>
            <div className="input-suffix">
              <input type="number" min="0" step="0.1" value={node.excessLossDb} onChange={(e) => onChange({ excessLossDb: Number(e.target.value) })} />
              <b>dB</b>
            </div>
          </label>
        </div>
      ) : node.type !== 'olt' && (
        <label className="field">
          <span>Pérdida del nodo</span>
          <div className="input-suffix">
            <input type="number" min="0" step="0.01" value={node.lossDb} onChange={(e) => onChange({ lossDb: Number(e.target.value) })} />
            <b>dB</b>
          </div>
        </label>
      )}
    </div>
  )
}

export default function Simulator({ project, onBack }) {
  const [initialProject] = useState(() => getInitialProject(storageKeyForProject(project?.id)))
  const [nodes, setNodes] = useState(initialProject.nodes)
  const [attenuation, setAttenuation] = useState(initialProject.attenuation)
  const [selectedId, setSelectedId] = useState(initialProject.selectedId)
  const [newType, setNewType] = useState('mufa')
  const [saveStatus, setSaveStatus] = useState('Proyecto cargado')
  const saveTimerRef = useRef(null)
  const route = useMemo(() => calculateDynamicRoute(nodes, attenuation), [nodes, attenuation])
  const selected = nodes.find((node) => node.id === selectedId) || nodes[0]
  const selectedResult = route.checkpoints.find((point) => point.id === selected?.id)

  useEffect(() => {
    setSaveStatus('Guardando…')
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)

    saveTimerRef.current = window.setTimeout(() => {
      try {
        window.localStorage.setItem(storageKeyForProject(project?.id), JSON.stringify({
          version: 1,
          nodes,
          attenuation,
          selectedId,
          savedAt: new Date().toISOString(),
        }))
        setSaveStatus('Guardado automáticamente')
      } catch (error) {
        console.error('No se pudo guardar el proyecto.', error)
        setSaveStatus('Error al guardar')
      }
    }, 250)

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    }
  }, [nodes, attenuation, selectedId, project?.id])

  const resetProject = () => {
    const confirmed = window.confirm('¿Restaurar el escenario inicial? Se perderán los cambios guardados en este navegador.')
    if (!confirmed) return

    window.localStorage.removeItem(storageKeyForProject(project?.id))
    setNodes(starterNodes)
    setAttenuation(0.35)
    setSelectedId('mufa-1')
    setSaveStatus('Escenario restaurado')
  }

  const exportProject = () => {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      attenuation,
      nodes,
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'proyecto-ftth.json'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const updateNode = (id, patch) => {
    setNodes((current) => current.map((node) => node.id === id ? { ...node, ...patch } : node))
  }

  const addNode = () => {
    const insertAt = Math.max(1, nodes.length - 1)
    const meta = typeMeta[newType]
    const count = nodes.filter((node) => node.type === newType).length + 1
    const node = {
      id: uid(newType),
      type: newType,
      name: `${meta.label} ${String(count).padStart(2, '0')}`,
      distanceFromPrevious: 250,
      ...(newType === 'splitter' ? { outputs: 8, excessLossDb: 1 } : { lossDb: meta.defaultLoss }),
    }
    setNodes((current) => [...current.slice(0, insertAt), node, ...current.slice(insertAt)])
    setSelectedId(node.id)
  }

  const deleteNode = (id) => {
    setNodes((current) => current.filter((node) => node.id !== id))
    setSelectedId(nodes[0]?.id)
  }

  const powerClass = route.rxPowerDbm >= -20 ? 'good' : route.rxPowerDbm >= -27 ? 'warn' : 'bad'

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <div className="brand-row">
            <span className="brand-mark">FTTH</span>
            <span className="eyebrow">NETWORK LAB</span>
          </div>
          <h1>{project?.name || 'Diseñador y simulador de red óptica'}</h1>
          <p className="hero-copy">Construye la ruta, define distancias, pérdidas y splitters, y observa la potencia óptica en cada punto.</p>
        </div>
        <div className="hero-actions">
          <button className="back-btn" onClick={onBack}>← Proyectos</button>
          <div className={`rx-badge ${powerClass}`}>
          <span>ONT estimada</span>
          <strong>{route.rxPowerDbm.toFixed(2)} dBm</strong>
          </div>
        </div>
      </header>

      <main className="designer-grid">
        <aside className="toolbox panel">
          <p className="eyebrow">CONSTRUCTOR</p>
          <h2>Agregar elementos</h2>
          <p className="muted">Los nuevos nodos se insertan antes de la ONT.</p>

          <label className="field">
            <span>Tipo de elemento</span>
            <select value={newType} onChange={(e) => setNewType(e.target.value)}>
              <option value="odf">ODF</option>
              <option value="mufa">Mufa</option>
              <option value="splitter">Splitter</option>
              <option value="nap">NAP / CTO</option>
            </select>
          </label>
          <button className="primary-btn full" onClick={addNode}>+ Agregar a la ruta</button>

          <div className="divider" />

          <label className="field">
            <span>Atenuación de fibra</span>
            <div className="input-suffix">
              <input type="number" min="0" step="0.01" value={attenuation} onChange={(e) => setAttenuation(Number(e.target.value))} />
              <b>dB/km</b>
            </div>
          </label>

          <div className="stat-list">
            <div><span>Distancia total</span><strong>{route.totalDistanceMeters.toLocaleString()} m</strong></div>
            <div><span>Pérdida total</span><strong>{route.totalLossDb.toFixed(2)} dB</strong></div>
            <div><span>Nodos</span><strong>{nodes.length}</strong></div>
          </div>

          <div className="divider" />

          <div className="stat-list">
            <div><span>Estado</span><strong>{saveStatus}</strong></div>
          </div>
          <button className="primary-btn full" onClick={exportProject}>Descargar respaldo JSON</button>
          <button className="icon-btn full reset-btn" onClick={resetProject}>Restaurar escenario inicial</button>

          <div className="mini-note">
            Los cambios se guardan automáticamente en este navegador. El respaldo JSON sirve para conservar una copia externa. El motor ya está preparado para coordenadas reales cuando agreguemos el mapa.
          </div>
        </aside>

        <section className="canvas panel">
          <div className="canvas-head">
            <div>
              <p className="eyebrow">RUTA ACTIVA</p>
              <h2>OLT → cliente</h2>
            </div>
            <div className="legend">
              <span><i className="dot good-dot" /> potencia cómoda</span>
              <span><i className="dot warn-dot" /> revisar margen</span>
              <span><i className="dot bad-dot" /> potencia crítica</span>
            </div>
          </div>

          <div className="route-canvas">
            {nodes.map((node, index) => {
              const result = route.checkpoints[index]
              const next = nodes[index + 1]
              return (
                <div className="route-row" key={node.id}>
                  <button className={`route-node ${selectedId === node.id ? 'selected' : ''}`} onClick={() => setSelectedId(node.id)}>
                    <div className="route-node-icon"><NodeIcon type={node.type} /></div>
                    <div className="route-node-copy">
                      <small>{typeMeta[node.type]?.label}</small>
                      <strong>{node.name}</strong>
                      <span>{result?.powerDbm.toFixed(2)} dBm</span>
                    </div>
                  </button>

                  {next && (
                    <div className="route-segment">
                      <div className="segment-line">
                        <span />
                      </div>
                      <div className="segment-data">
                        <b>{next.distanceFromPrevious.toLocaleString()} m</b>
                        <small>−{result && route.checkpoints[index + 1] ? route.checkpoints[index + 1].fiberLossDb.toFixed(2) : '0.00'} dB fibra</small>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="power-strip">
            {route.checkpoints.map((point) => (
              <div key={point.id}>
                <small>{point.label}</small>
                <strong>{point.powerDbm.toFixed(2)}</strong>
                <span>dBm</span>
              </div>
            ))}
          </div>
        </section>

        <aside className="inspector panel">
          <p className="eyebrow">INSPECTOR</p>
          <h2>{selected?.name}</h2>
          <p className="muted">{typeMeta[selected?.type]?.label}</p>

          {selected && (
            <NodeEditor
              node={selected}
              onChange={(patch) => updateNode(selected.id, patch)}
              onDelete={() => deleteNode(selected.id)}
              isFirst={selected.id === nodes[0]?.id}
              isLast={selected.id === nodes[nodes.length - 1]?.id}
            />
          )}

          {selectedResult && (
            <div className="measurement-card">
              <span>Potencia en este punto</span>
              <strong>{selectedResult.powerDbm.toFixed(2)} dBm</strong>
              <div>
                <small>Pérdida tramo</small>
                <b>−{selectedResult.fiberLossDb.toFixed(2)} dB</b>
              </div>
              <div>
                <small>Pérdida elemento</small>
                <b>−{selectedResult.nodeLossDb.toFixed(2)} dB</b>
              </div>
            </div>
          )}
        </aside>
      </main>
    </div>
  )
}
