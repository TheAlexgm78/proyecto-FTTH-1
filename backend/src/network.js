import { pool } from './db.js'

async function assertProjectOwner(projectId, userId) {
  const result = await pool.query(
    'SELECT id FROM projects WHERE id = $1 AND owner_user_id = $2 LIMIT 1',
    [projectId, userId],
  )
  return Boolean(result.rows[0])
}

function numberOrNull(value) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function splitterLoss(outputs, excessLossDb = 1) {
  const n = Number(outputs || 0)
  if (!Number.isFinite(n) || n <= 1) return 0
  return 10 * Math.log10(n) + Number(excessLossDb || 0)
}

function statusForPower(powerDbm) {
  if (powerDbm === null || powerDbm === undefined || !Number.isFinite(Number(powerDbm))) return 'unknown'
  const value = Number(powerDbm)
  if (value >= -20) return 'good'
  if (value >= -24) return 'warning'
  if (value >= -27) return 'low'
  return 'critical'
}

function buildPowerModel(nodes, links) {
  const nodeById = new Map(nodes.map((node) => [Number(node.id), node]))
  const outgoing = new Map()

  for (const link of links) {
    const from = Number(link.from_node_id)
    if (!outgoing.has(from)) outgoing.set(from, [])
    outgoing.get(from).push(link)
  }

  const powerByNode = new Map()
  const queue = []

  for (const node of nodes) {
    const tx = numberOrNull(node.tx_power_dbm)
    if (tx !== null) {
      powerByNode.set(Number(node.id), tx)
      queue.push(Number(node.id))
    }
  }

  const linkPower = new Map()
  const visitedEdges = new Set()

  while (queue.length) {
    const fromId = queue.shift()
    const sourcePower = powerByNode.get(fromId)
    if (!Number.isFinite(sourcePower)) continue

    for (const link of outgoing.get(fromId) || []) {
      const edgeId = Number(link.id)
      if (visitedEdges.has(edgeId)) continue
      visitedEdges.add(edgeId)

      const toId = Number(link.to_node_id)
      const destination = nodeById.get(toId)
      if (!destination) continue

      const lengthMeters = Number(link.length_m || 0)
      const attenuation = Number(link.attenuation_db_km || 0.35)
      const cableLossDb = (lengthMeters / 1000) * attenuation
      const nodeLossDb = Number(destination.optical_loss_db || 0)
      const excess = Number(destination.properties?.splitterExcessDb ?? 1)
      const splitLossDb = splitterLoss(destination.splitter_outputs, excess)
      const endPower = sourcePower - cableLossDb - nodeLossDb - splitLossDb

      linkPower.set(edgeId, {
        startPowerDbm: sourcePower,
        endPowerDbm: endPower,
        cableLossDb,
        destinationLossDb: nodeLossDb + splitLossDb,
      })

      if (!powerByNode.has(toId) || endPower > powerByNode.get(toId)) {
        powerByNode.set(toId, endPower)
        queue.push(toId)
      }
    }
  }

  return { powerByNode, linkPower }
}

function nodeDto(row, powerDbm) {
  const power = powerDbm ?? null
  return {
    id: Number(row.id),
    projectId: Number(row.project_id),
    type: row.node_type,
    name: row.name,
    opticalLossDb: Number(row.optical_loss_db || 0),
    txPowerDbm: numberOrNull(row.tx_power_dbm),
    splitterOutputs: row.splitter_outputs === null ? null : Number(row.splitter_outputs),
    properties: row.properties || {},
    lng: row.lng === null ? null : Number(row.lng),
    lat: row.lat === null ? null : Number(row.lat),
    powerDbm: power,
    powerStatus: statusForPower(power),
  }
}

function linkDto(row, powerInfo) {
  return {
    id: Number(row.id),
    projectId: Number(row.project_id),
    fromNodeId: row.from_node_id === null ? null : Number(row.from_node_id),
    toNodeId: row.to_node_id === null ? null : Number(row.to_node_id),
    name: row.name || '',
    fiberCount: row.fiber_count === null ? null : Number(row.fiber_count),
    attenuationDbKm: Number(row.attenuation_db_km || 0.35),
    properties: row.properties || {},
    geometry: row.geometry ? JSON.parse(row.geometry) : null,
    lengthMeters: Number(row.length_m || 0),
    cableLossDb: powerInfo?.cableLossDb ?? ((Number(row.length_m || 0) / 1000) * Number(row.attenuation_db_km || 0.35)),
    startPowerDbm: powerInfo?.startPowerDbm ?? null,
    endPowerDbm: powerInfo?.endPowerDbm ?? null,
    powerStatus: statusForPower(powerInfo?.endPowerDbm),
  }
}

async function loadRows(projectId) {
  const [nodesResult, linksResult] = await Promise.all([
    pool.query(
      `SELECT id, project_id, node_type, name, optical_loss_db, tx_power_dbm,
              splitter_outputs, properties,
              CASE WHEN geom IS NULL THEN NULL ELSE ST_X(geom) END AS lng,
              CASE WHEN geom IS NULL THEN NULL ELSE ST_Y(geom) END AS lat
       FROM network_nodes
       WHERE project_id = $1
       ORDER BY id`,
      [projectId],
    ),
    pool.query(
      `SELECT id, project_id, from_node_id, to_node_id, name, fiber_count,
              attenuation_db_km, properties,
              CASE WHEN geom IS NULL THEN NULL ELSE ST_AsGeoJSON(geom) END AS geometry,
              CASE WHEN geom IS NULL THEN 0 ELSE ST_Length(geom::geography) END AS length_m
       FROM network_links
       WHERE project_id = $1
       ORDER BY id`,
      [projectId],
    ),
  ])
  return { nodes: nodesResult.rows, links: linksResult.rows }
}

export async function getNetwork(req, res) {
  const projectId = Number(req.params.projectId)
  if (!(await assertProjectOwner(projectId, req.user.id))) {
    return res.status(404).json({ ok: false, error: 'Proyecto no encontrado.' })
  }

  try {
    const rows = await loadRows(projectId)
    const power = buildPowerModel(rows.nodes, rows.links)
    return res.json({
      ok: true,
      nodes: rows.nodes.map((row) => nodeDto(row, power.powerByNode.get(Number(row.id)))),
      links: rows.links.map((row) => linkDto(row, power.linkPower.get(Number(row.id)))),
    })
  } catch (error) {
    console.error('GET_NETWORK_ERROR', error)
    return res.status(500).json({ ok: false, error: 'No se pudo cargar la red.' })
  }
}

export async function createNode(req, res) {
  const projectId = Number(req.params.projectId)
  if (!(await assertProjectOwner(projectId, req.user.id))) {
    return res.status(404).json({ ok: false, error: 'Proyecto no encontrado.' })
  }

  const type = String(req.body?.type || '').trim()
  const name = String(req.body?.name || '').trim()
  const lng = Number(req.body?.lng)
  const lat = Number(req.body?.lat)

  if (!type || !name || !Number.isFinite(lng) || !Number.isFinite(lat)) {
    return res.status(400).json({ ok: false, error: 'Tipo, nombre y coordenadas son obligatorios.' })
  }

  try {
    const result = await pool.query(
      `INSERT INTO network_nodes (
         project_id, node_type, name, optical_loss_db, tx_power_dbm,
         splitter_outputs, properties, geom
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, ST_SetSRID(ST_MakePoint($8, $9), 4326))
       RETURNING id`,
      [
        projectId,
        type,
        name,
        Number(req.body?.opticalLossDb || 0),
        numberOrNull(req.body?.txPowerDbm),
        req.body?.splitterOutputs === null || req.body?.splitterOutputs === undefined
          ? null
          : Number(req.body.splitterOutputs),
        JSON.stringify(req.body?.properties || {}),
        lng,
        lat,
      ],
    )

    req.params.nodeId = String(result.rows[0].id)
    return getNetwork(req, res)
  } catch (error) {
    console.error('CREATE_NODE_ERROR', error)
    return res.status(500).json({ ok: false, error: 'No se pudo crear el elemento.' })
  }
}

export async function updateNode(req, res) {
  const projectId = Number(req.params.projectId)
  const nodeId = Number(req.params.nodeId)
  if (!(await assertProjectOwner(projectId, req.user.id))) {
    return res.status(404).json({ ok: false, error: 'Proyecto no encontrado.' })
  }

  try {
    const current = await pool.query(
      'SELECT * FROM network_nodes WHERE id = $1 AND project_id = $2 LIMIT 1',
      [nodeId, projectId],
    )
    if (!current.rows[0]) {
      return res.status(404).json({ ok: false, error: 'Elemento no encontrado.' })
    }

    const row = current.rows[0]
    const hasCoords = Number.isFinite(Number(req.body?.lng)) && Number.isFinite(Number(req.body?.lat))

    await pool.query(
      `UPDATE network_nodes
       SET name = $1,
           optical_loss_db = $2,
           tx_power_dbm = $3,
           splitter_outputs = $4,
           properties = $5::jsonb,
           geom = CASE WHEN $6::boolean
                       THEN ST_SetSRID(ST_MakePoint($7, $8), 4326)
                       ELSE geom END
       WHERE id = $9 AND project_id = $10`,
      [
        String(req.body?.name ?? row.name),
        Number(req.body?.opticalLossDb ?? row.optical_loss_db ?? 0),
        req.body?.txPowerDbm === undefined ? row.tx_power_dbm : numberOrNull(req.body.txPowerDbm),
        req.body?.splitterOutputs === undefined ? row.splitter_outputs : numberOrNull(req.body.splitterOutputs),
        JSON.stringify(req.body?.properties ?? row.properties ?? {}),
        hasCoords,
        hasCoords ? Number(req.body.lng) : 0,
        hasCoords ? Number(req.body.lat) : 0,
        nodeId,
        projectId,
      ],
    )

    return getNetwork(req, res)
  } catch (error) {
    console.error('UPDATE_NODE_ERROR', error)
    return res.status(500).json({ ok: false, error: 'No se pudo actualizar el elemento.' })
  }
}

export async function deleteNode(req, res) {
  const projectId = Number(req.params.projectId)
  const nodeId = Number(req.params.nodeId)
  if (!(await assertProjectOwner(projectId, req.user.id))) {
    return res.status(404).json({ ok: false, error: 'Proyecto no encontrado.' })
  }

  try {
    await pool.query('DELETE FROM network_nodes WHERE id = $1 AND project_id = $2', [nodeId, projectId])
    return getNetwork(req, res)
  } catch (error) {
    console.error('DELETE_NODE_ERROR', error)
    return res.status(500).json({ ok: false, error: 'No se pudo eliminar el elemento.' })
  }
}

export async function createLink(req, res) {
  const projectId = Number(req.params.projectId)
  if (!(await assertProjectOwner(projectId, req.user.id))) {
    return res.status(404).json({ ok: false, error: 'Proyecto no encontrado.' })
  }

  const coordinates = Array.isArray(req.body?.coordinates) ? req.body.coordinates : []
  if (coordinates.length < 2) {
    return res.status(400).json({ ok: false, error: 'El cable necesita al menos dos puntos.' })
  }

  const geometry = {
    type: 'LineString',
    coordinates: coordinates.map((point) => [Number(point[0]), Number(point[1])]),
  }

  try {
    await pool.query(
      `INSERT INTO network_links (
         project_id, from_node_id, to_node_id, name, fiber_count,
         attenuation_db_km, properties, geom
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb,
               ST_SetSRID(ST_GeomFromGeoJSON($8), 4326))`,
      [
        projectId,
        numberOrNull(req.body?.fromNodeId),
        numberOrNull(req.body?.toNodeId),
        String(req.body?.name || ''),
        numberOrNull(req.body?.fiberCount),
        Number(req.body?.attenuationDbKm || 0.35),
        JSON.stringify(req.body?.properties || {}),
        JSON.stringify(geometry),
      ],
    )

    return getNetwork(req, res)
  } catch (error) {
    console.error('CREATE_LINK_ERROR', error)
    return res.status(500).json({ ok: false, error: 'No se pudo guardar el cable.' })
  }
}

export async function deleteLink(req, res) {
  const projectId = Number(req.params.projectId)
  const linkId = Number(req.params.linkId)
  if (!(await assertProjectOwner(projectId, req.user.id))) {
    return res.status(404).json({ ok: false, error: 'Proyecto no encontrado.' })
  }

  try {
    await pool.query('DELETE FROM network_links WHERE id = $1 AND project_id = $2', [linkId, projectId])
    return getNetwork(req, res)
  } catch (error) {
    console.error('DELETE_LINK_ERROR', error)
    return res.status(500).json({ ok: false, error: 'No se pudo eliminar el cable.' })
  }
}
