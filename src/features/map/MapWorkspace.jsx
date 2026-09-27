import { useEffect, useMemo, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { api } from '../../services/api'

const NODE_TYPES = {
  central: { label: 'Central / cabecera', icon: '◎' },
  olt: { label: 'OLT', icon: '◉' },
  mufa: { label: 'Mufa', icon: '⬡' },
  nap: { label: 'CTO / NAP', icon: '▣' },
}

const POWER_COLORS = {
  good: '#34c98f',
  warning: '#e6c24f',
  low: '#ef8b45',
  critical: '#ef5d66',
  unknown: '#8a98a8',
}

const MASAYA_CENTER = [-86.094, 11.974]

function nodeDefaultName(type, nodes) {
  const count = nodes.filter((node) => node.type === type).length + 1
  if (type === 'central') return `CENTRAL-${String(count).padStart(2, '0')}`
  if (type === 'olt') return `OLT-${String(count).padStart(2, '0')}`
  if (type === 'mufa') return `MUFA-${String(count).padStart(3, '0')}`
  return `CTO-${String(count).padStart(3, '0')}`
}

function powerText(value) {
  if (value === null || value === undefined || value === '') return 'Sin cálculo'
  return Number.isFinite(Number(value)) ? `${Number(value).toFixed(2)} dBm` : 'Sin cálculo'
}

function NodeDetails({ node, onDelete }) {
  if (!node) {
    return (
      <div className="map-empty-inspector">
        Selecciona una Central, Mufa o CTO/NAP para ver sus datos.
      </div>
    )
  }

  return (
    <div className="map-detail-card">
      <div className="map-detail-title">
        <span className="map-detail-icon">{NODE_TYPES[node.type]?.icon || '•'}</span>
        <div>
          <small>{NODE_TYPES[node.type]?.label || node.type}</small>
          <h3>{node.name}</h3>
        </div>
      </div>

      <div className="map-metric">
        <span>Potencia estimada</span>
        <strong style={{ color: POWER_COLORS[node.powerStatus] }}>{powerText(node.powerDbm)}</strong>
      </div>

      {node.txPowerDbm !== null && (
        <div className="map-row"><span>TX configurada</span><b>{node.txPowerDbm.toFixed(2)} dBm</b></div>
      )}
      <div className="map-row"><span>Pérdida elemento</span><b>{node.opticalLossDb.toFixed(2)} dB</b></div>

      {node.type === 'nap' && (
        <>
          <div className="map-row"><span>Splitter</span><b>1:{node.splitterOutputs || '—'}</b></div>
          <div className="map-row"><span>Puertos CTO/NAP</span><b>{node.properties?.portCapacity || '—'}</b></div>
        </>
      )}

      <div className="map-coordinates">
        {node.lat?.toFixed(6)}, {node.lng?.toFixed(6)}
      </div>
      <p className="map-help">Puedes arrastrar este punto en el mapa para corregir su ubicación.</p>

      <button className="danger-btn full" onClick={() => onDelete(node)}>Eliminar elemento</button>
    </div>
  )
}

function LinkDetails({ link, onDelete }) {
  if (!link) return null
  return (
    <div className="map-detail-card">
      <div className="map-detail-title">
        <span className="map-detail-icon">━</span>
        <div>
          <small>CABLE</small>
          <h3>{link.name || `${link.fiberCount || '—'}F`}</h3>
        </div>
      </div>

      <div className="map-metric">
        <span>Potencia al final</span>
        <strong style={{ color: POWER_COLORS[link.powerStatus] }}>{powerText(link.endPowerDbm)}</strong>
      </div>

      <div className="map-row"><span>Tipo</span><b>{link.properties?.cableType || 'Sin definir'}</b></div>
      <div className="map-row"><span>Capacidad</span><b>{link.fiberCount || '—'} fibras</b></div>
      <div className="map-row"><span>Longitud</span><b>{link.lengthMeters.toFixed(1)} m</b></div>
      <div className="map-row"><span>Atenuación</span><b>{link.attenuationDbKm.toFixed(2)} dB/km</b></div>
      <div className="map-row"><span>Pérdida fibra</span><b>{link.cableLossDb.toFixed(3)} dB</b></div>

      <button className="danger-btn full" onClick={() => onDelete(link)}>Eliminar cable</button>
    </div>
  )
}

export default function MapWorkspace({ project, onBack, onOpenSimulator }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])
  const modeRef = useRef('select')
  const draftRef = useRef({ startNode: null, coordinates: [] })
  const nodeFormRef = useRef(null)
  const cableFormRef = useRef(null)

  const [network, setNetwork] = useState({ nodes: [], links: [] })
  const [mode, setMode] = useState('select')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedNodeId, setSelectedNodeId] = useState(null)
  const [selectedLinkId, setSelectedLinkId] = useState(null)
  const [draft, setDraft] = useState({ startNode: null, coordinates: [] })

  const [nodeForm, setNodeForm] = useState({
    type: 'mufa',
    name: '',
    txPowerDbm: 4.5,
    opticalLossDb: 0.08,
    splitterOutputs: 8,
    portCapacity: 8,
  })

  const [cableForm, setCableForm] = useState({
    name: '',
    cableType: 'principal',
    fiberCount: 144,
    attenuationDbKm: 0.35,
  })

  modeRef.current = mode
  draftRef.current = draft
  nodeFormRef.current = nodeForm
  cableFormRef.current = cableForm

  const selectedNode = useMemo(
    () => network.nodes.find((node) => node.id === selectedNodeId) || null,
    [network.nodes, selectedNodeId],
  )

  const selectedLink = useMemo(
    () => network.links.find((link) => link.id === selectedLinkId) || null,
    [network.links, selectedLinkId],
  )

  const setNetworkFromResponse = (data) => {
    setNetwork({ nodes: data.nodes || [], links: data.links || [] })
  }

  const loadNetwork = async () => {
    setLoading(true)
    setError('')
    try {
      setNetworkFromResponse(await api.getNetwork(project.id))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNetwork()
  }, [project.id])

  const cancelMode = () => {
    setMode('select')
    setDraft({ startNode: null, coordinates: [] })
  }

  const createNodeAt = async (lng, lat) => {
    const form = nodeFormRef.current
    const name = form.name.trim() || nodeDefaultName(form.type, network.nodes)
    const isSource = form.type === 'central' || form.type === 'olt'

    try {
      const data = await api.createNode(project.id, {
        type: form.type,
        name,
        lng,
        lat,
        txPowerDbm: isSource ? Number(form.txPowerDbm) : null,
        opticalLossDb: isSource ? 0 : Number(form.opticalLossDb),
        splitterOutputs: form.type === 'nap' ? Number(form.splitterOutputs) : null,
        properties: form.type === 'nap'
          ? { portCapacity: Number(form.portCapacity), splitterExcessDb: 1 }
          : {},
      })
      setNetworkFromResponse(data)
      setNodeForm((current) => ({ ...current, name: '' }))
      setMode('select')
    } catch (err) {
      setError(err.message)
    }
  }

  const finishCable = async (endNode) => {
    const current = draftRef.current
    if (!current.startNode || current.startNode.id === endNode.id) return

    const form = cableFormRef.current
    const coordinates = [
      ...current.coordinates,
      [endNode.lng, endNode.lat],
    ]

    try {
      const data = await api.createLink(project.id, {
        fromNodeId: current.startNode.id,
        toNodeId: endNode.id,
        name: form.name.trim() || `${form.cableType.toUpperCase()}-${form.fiberCount}F`,
        fiberCount: Number(form.fiberCount),
        attenuationDbKm: Number(form.attenuationDbKm),
        properties: { cableType: form.cableType },
        coordinates,
      })
      setNetworkFromResponse(data)
      setCableForm((old) => ({ ...old, name: '' }))
      cancelMode()
    } catch (err) {
      setError(err.message)
    }
  }

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/bright',
      center: MASAYA_CENTER,
      zoom: 13,
    })

    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    mapRef.current = map

    map.on('load', () => {
      map.addSource('ftth-links', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
      map.addLayer({
        id: 'ftth-links-shadow',
        type: 'line',
        source: 'ftth-links',
        paint: {
          'line-color': '#071018',
          'line-width': 8,
          'line-opacity': 0.68,
        },
      })
      map.addLayer({
        id: 'ftth-links-line',
        type: 'line',
        source: 'ftth-links',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['case', ['>=', ['get', 'fiberCount'], 96], 5, 4],
          'line-opacity': 0.95,
        },
      })

      map.addSource('ftth-draft', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })
      map.addLayer({
        id: 'ftth-draft-line',
        type: 'line',
        source: 'ftth-draft',
        paint: {
          'line-color': '#2b82e6',
          'line-width': 4,
          'line-dasharray': [2, 2],
        },
      })

      map.on('click', 'ftth-links-line', (event) => {
        const feature = event.features?.[0]
        if (!feature) return
        setSelectedLinkId(Number(feature.properties.id))
        setSelectedNodeId(null)
      })

      map.on('mouseenter', 'ftth-links-line', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'ftth-links-line', () => {
        map.getCanvas().style.cursor = ''
      })
    })

    map.on('click', (event) => {
      if (modeRef.current === 'add-node') {
        createNodeAt(event.lngLat.lng, event.lngLat.lat)
        return
      }

      if (modeRef.current === 'draw-link' && draftRef.current.startNode) {
        setDraft((current) => ({
          ...current,
          coordinates: [...current.coordinates, [event.lngLat.lng, event.lngLat.lat]],
        }))
      }
    })

    return () => {
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return
    const source = map.getSource('ftth-links')
    if (!source) return

    source.setData({
      type: 'FeatureCollection',
      features: network.links
        .filter((link) => link.geometry)
        .map((link) => ({
          type: 'Feature',
          properties: {
            id: link.id,
            fiberCount: link.fiberCount || 0,
            color: POWER_COLORS[link.powerStatus] || POWER_COLORS.unknown,
          },
          geometry: link.geometry,
        })),
    })
  }, [network.links])

  useEffect(() => {
    const map = mapRef.current
    if (!map?.isStyleLoaded()) return
    const source = map.getSource('ftth-draft')
    if (!source) return

    const coordinates = draft.coordinates
    source.setData({
      type: 'FeatureCollection',
      features: coordinates.length >= 2
        ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } }]
        : [],
    })
  }, [draft])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []

    for (const node of network.nodes) {
      if (!Number.isFinite(node.lng) || !Number.isFinite(node.lat)) continue

      const el = document.createElement('button')
      el.type = 'button'
      el.className = `ftth-map-marker status-${node.powerStatus} ${selectedNodeId === node.id ? 'selected' : ''}`
      el.title = `${node.name} · ${powerText(node.powerDbm)}`
      el.innerHTML = `<span>${NODE_TYPES[node.type]?.icon || '•'}</span><small>${node.name}</small>`

      el.addEventListener('click', (event) => {
        event.stopPropagation()

        if (modeRef.current === 'draw-link') {
          const current = draftRef.current
          if (!current.startNode) {
            setDraft({
              startNode: node,
              coordinates: [[node.lng, node.lat]],
            })
          } else {
            finishCable(node)
          }
          return
        }

        setSelectedNodeId(node.id)
        setSelectedLinkId(null)
      })

      const marker = new maplibregl.Marker({ element: el, draggable: modeRef.current !== 'draw-link' })
        .setLngLat([node.lng, node.lat])
        .addTo(map)

      marker.on('dragend', async () => {
        const lngLat = marker.getLngLat()
        try {
          setNetworkFromResponse(await api.updateNode(project.id, node.id, {
            lng: lngLat.lng,
            lat: lngLat.lat,
          }))
        } catch (err) {
          setError(err.message)
          loadNetwork()
        }
      })

      markersRef.current.push(marker)
    }
  }, [network.nodes, selectedNodeId, mode, project.id])

  const deleteNode = async (node) => {
    if (!window.confirm(`¿Eliminar ${node.name}? También se eliminarán sus cables conectados.`)) return
    try {
      setNetworkFromResponse(await api.deleteNode(project.id, node.id))
      setSelectedNodeId(null)
    } catch (err) {
      setError(err.message)
    }
  }

  const deleteLink = async (link) => {
    if (!window.confirm(`¿Eliminar el cable ${link.name || link.id}?`)) return
    try {
      setNetworkFromResponse(await api.deleteLink(project.id, link.id))
      setSelectedLinkId(null)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="map-system">
      <header className="map-topbar">
        <div>
          <div className="brand-row">
            <span className="brand-mark">FTTH</span>
            <span className="eyebrow">GIS NETWORK</span>
          </div>
          <h1>{project.name}</h1>
          <p>Red ramificada · PostGIS · potencia óptica por sector</p>
        </div>
        <div className="map-top-actions">
          <button className="back-btn" onClick={onBack}>← Proyectos</button>
          <button className="back-btn" onClick={onOpenSimulator}>Simulador óptico</button>
        </div>
      </header>

      {error && <div className="map-global-error">{error}</div>}

      <main className="map-layout">
        <aside className="map-tools panel">
          <p className="eyebrow">HERRAMIENTAS</p>
          <h2>Construir red</h2>

          <div className="map-mode-status">
            {mode === 'select' && 'Modo selección'}
            {mode === 'add-node' && 'Haz clic en el mapa para colocar el elemento'}
            {mode === 'draw-link' && !draft.startNode && 'Haz clic en el nodo de origen'}
            {mode === 'draw-link' && draft.startNode && 'Marca la ruta y termina haciendo clic en el nodo destino'}
          </div>

          <label className="field">
            <span>Elemento</span>
            <select value={nodeForm.type} onChange={(e) => setNodeForm((old) => ({ ...old, type: e.target.value }))}>
              <option value="central">Central / cabecera</option>
              <option value="olt">OLT</option>
              <option value="mufa">Mufa</option>
              <option value="nap">CTO / NAP</option>
            </select>
          </label>

          <label className="field">
            <span>Nombre (opcional)</span>
            <input value={nodeForm.name} onChange={(e) => setNodeForm((old) => ({ ...old, name: e.target.value }))} placeholder="Se genera automáticamente" />
          </label>

          {(nodeForm.type === 'central' || nodeForm.type === 'olt') && (
            <label className="field">
              <span>Potencia TX</span>
              <div className="input-suffix">
                <input type="number" step="0.1" value={nodeForm.txPowerDbm} onChange={(e) => setNodeForm((old) => ({ ...old, txPowerDbm: e.target.value }))} />
                <b>dBm</b>
              </div>
            </label>
          )}

          {(nodeForm.type === 'mufa' || nodeForm.type === 'nap') && (
            <label className="field">
              <span>Pérdida del elemento</span>
              <div className="input-suffix">
                <input type="number" step="0.01" min="0" value={nodeForm.opticalLossDb} onChange={(e) => setNodeForm((old) => ({ ...old, opticalLossDb: e.target.value }))} />
                <b>dB</b>
              </div>
            </label>
          )}

          {nodeForm.type === 'nap' && (
            <div className="map-two-fields">
              <label className="field">
                <span>Splitter</span>
                <select value={nodeForm.splitterOutputs} onChange={(e) => setNodeForm((old) => ({ ...old, splitterOutputs: e.target.value }))}>
                  {[4, 6, 8, 12, 16, 32].map((n) => <option key={n} value={n}>1:{n}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Puertos</span>
                <select value={nodeForm.portCapacity} onChange={(e) => setNodeForm((old) => ({ ...old, portCapacity: e.target.value }))}>
                  {[4, 6, 8, 12, 16, 24].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            </div>
          )}

          <button className="primary-btn full" onClick={() => { setMode('add-node'); setDraft({ startNode: null, coordinates: [] }) }}>
            + Colocar en mapa
          </button>

          <div className="divider" />

          <p className="eyebrow">CABLE</p>
          <label className="field">
            <span>Tipo de red</span>
            <select value={cableForm.cableType} onChange={(e) => setCableForm((old) => ({ ...old, cableType: e.target.value }))}>
              <option value="principal">Principal / troncal</option>
              <option value="distribucion">Distribución</option>
              <option value="plana">Fibra plana</option>
              <option value="drop">Drop cliente</option>
            </select>
          </label>

          <label className="field">
            <span>Capacidad</span>
            <select value={cableForm.fiberCount} onChange={(e) => setCableForm((old) => ({ ...old, fiberCount: e.target.value }))}>
              {[12, 24, 48, 96, 144].map((n) => <option key={n} value={n}>{n} fibras</option>)}
            </select>
          </label>

          <label className="field">
            <span>Nombre (opcional)</span>
            <input value={cableForm.name} onChange={(e) => setCableForm((old) => ({ ...old, name: e.target.value }))} placeholder="Ej. TRONCAL-001" />
          </label>

          <label className="field">
            <span>Atenuación</span>
            <div className="input-suffix">
              <input type="number" step="0.01" value={cableForm.attenuationDbKm} onChange={(e) => setCableForm((old) => ({ ...old, attenuationDbKm: e.target.value }))} />
              <b>dB/km</b>
            </div>
          </label>

          <button className="primary-btn full" onClick={() => { setMode('draw-link'); setDraft({ startNode: null, coordinates: [] }) }}>
            Dibujar cable
          </button>

          {mode !== 'select' && <button className="back-btn full map-cancel" onClick={cancelMode}>Cancelar herramienta</button>}

          <div className="divider" />
          <div className="map-summary">
            <div><span>Elementos</span><b>{network.nodes.length}</b></div>
            <div><span>Cables</span><b>{network.links.length}</b></div>
          </div>
        </aside>

        <section className="map-canvas-wrap">
          <div ref={containerRef} className="network-map" />
          {loading && <div className="map-loading">Cargando red…</div>}
          <div className="map-legend">
            <span><i style={{ background: POWER_COLORS.good }} /> Buena</span>
            <span><i style={{ background: POWER_COLORS.warning }} /> Atención</span>
            <span><i style={{ background: POWER_COLORS.low }} /> Baja</span>
            <span><i style={{ background: POWER_COLORS.critical }} /> Crítica</span>
            <span><i style={{ background: POWER_COLORS.unknown }} /> Sin cálculo</span>
          </div>
        </section>

        <aside className="map-inspector panel">
          <p className="eyebrow">INSPECTOR</p>
          {selectedLink ? (
            <LinkDetails link={selectedLink} onDelete={deleteLink} />
          ) : (
            <NodeDetails node={selectedNode} onDelete={deleteNode} />
          )}

          {!selectedNode && !selectedLink && (
            <div className="map-tutorial">
              <strong>Flujo recomendado</strong>
              <ol>
                <li>Coloca la Central u OLT.</li>
                <li>Coloca las mufas y CTO/NAP.</li>
                <li>Selecciona capacidad 144F, 24F, etc.</li>
                <li>Dibuja el cable desde un nodo hasta otro.</li>
                <li>El sistema calcula metros, pérdida y dBm.</li>
              </ol>
            </div>
          )}
        </aside>
      </main>
    </div>
  )
}
