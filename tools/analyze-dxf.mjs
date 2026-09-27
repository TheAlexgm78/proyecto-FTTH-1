import fs from 'node:fs'
import path from 'node:path'
import DxfParser from 'dxf-parser'

const input = process.argv[2]

if (!input) {
  console.error('Uso: npm run analyze:dxf -- "ruta\\archivo.dxf"')
  process.exit(1)
}

const absolute = path.resolve(input)
if (!fs.existsSync(absolute)) {
  console.error(`No existe el archivo: ${absolute}`)
  process.exit(1)
}

const parser = new DxfParser()
const source = fs.readFileSync(absolute, 'utf8')
const dxf = parser.parseSync(source)

const entities = Array.isArray(dxf.entities) ? dxf.entities : []
const byLayer = new Map()
const byType = new Map()
const networkTexts = []
const points = []

function addPoint(x, y) {
  const nx = Number(x)
  const ny = Number(y)
  if (Number.isFinite(nx) && Number.isFinite(ny)) points.push([nx, ny])
}

function walkEntity(entity) {
  const layer = entity.layer || 'SIN_CAPA'
  byLayer.set(layer, (byLayer.get(layer) || 0) + 1)
  byType.set(entity.type || 'UNKNOWN', (byType.get(entity.type || 'UNKNOWN') || 0) + 1)

  const text = String(entity.text || entity.string || entity.textValue || '').trim()
  if (text && /(MUFA|CTO|NAP|OLT|ODF|FIBRA|FO|144|96|48|24F|TELECABLE)/i.test(text)) {
    networkTexts.push({ layer, type: entity.type, text })
  }

  if (entity.position) addPoint(entity.position.x, entity.position.y)
  if (entity.center) addPoint(entity.center.x, entity.center.y)
  for (const vertex of entity.vertices || []) addPoint(vertex.x, vertex.y)
}

for (const entity of entities) walkEntity(entity)

const blockNames = Object.keys(dxf.blocks || {})
const layers = [...byLayer.entries()]
  .map(([name, count]) => ({ name, count }))
  .sort((a, b) => b.count - a.count)

const types = [...byType.entries()]
  .map(([type, count]) => ({ type, count }))
  .sort((a, b) => b.count - a.count)

const bounds = points.length
  ? {
      minX: Math.min(...points.map((p) => p[0])),
      minY: Math.min(...points.map((p) => p[1])),
      maxX: Math.max(...points.map((p) => p[0])),
      maxY: Math.max(...points.map((p) => p[1])),
    }
  : null

const report = {
  sourceFile: absolute,
  entityCount: entities.length,
  layerCount: layers.length,
  blockCount: blockNames.length,
  layers,
  entityTypes: types,
  blockNames,
  drawingBounds: bounds,
  header: dxf.header || {},
  networkTexts: networkTexts.slice(0, 1000),
}

const output = path.join(path.dirname(absolute), `${path.basename(absolute, path.extname(absolute))}.analysis.json`)
fs.writeFileSync(output, JSON.stringify(report, null, 2), 'utf8')

console.log('DXF analizado correctamente.')
console.log(`Entidades: ${report.entityCount}`)
console.log(`Capas: ${report.layerCount}`)
console.log(`Bloques: ${report.blockCount}`)
console.log(`Textos FTTH encontrados: ${networkTexts.length}`)
console.log(`Reporte: ${output}`)
