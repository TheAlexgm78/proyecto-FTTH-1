export function fiberLoss(distanceMeters, attenuationDbPerKm) {
  return (Math.max(0, Number(distanceMeters || 0)) / 1000) * Math.max(0, Number(attenuationDbPerKm || 0))
}

export function splitterLoss(outputs, excessLossDb = 1) {
  const n = Math.max(1, Number(outputs || 1))
  return 10 * Math.log10(n) + Math.max(0, Number(excessLossDb || 0))
}

export function nodeLoss(node) {
  if (!node) return 0
  if (node.type === 'splitter') {
    return splitterLoss(node.outputs, node.excessLossDb)
  }
  return Math.max(0, Number(node.lossDb || 0))
}

export function calculateDynamicRoute(nodes, attenuationDbPerKm = 0.35) {
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return { checkpoints: [], totalLossDb: 0, rxPowerDbm: 0, totalDistanceMeters: 0 }
  }

  const first = nodes[0]
  let power = Number(first.txPowerDbm || 0)
  let totalLoss = 0
  let totalDistanceMeters = 0
  const checkpoints = [{
    id: first.id,
    label: first.name,
    type: first.type,
    powerDbm: power,
    nodeLossDb: 0,
    fiberLossDb: 0,
    distanceFromPrevious: 0,
  }]

  for (let index = 1; index < nodes.length; index += 1) {
    const node = nodes[index]
    const distance = Math.max(0, Number(node.distanceFromPrevious || 0))
    const cableLoss = fiberLoss(distance, attenuationDbPerKm)
    const equipmentLoss = nodeLoss(node)

    power -= cableLoss
    totalLoss += cableLoss
    totalDistanceMeters += distance

    power -= equipmentLoss
    totalLoss += equipmentLoss

    checkpoints.push({
      id: node.id,
      label: node.name,
      type: node.type,
      powerDbm: power,
      nodeLossDb: equipmentLoss,
      fiberLossDb: cableLoss,
      distanceFromPrevious: distance,
    })
  }

  return {
    checkpoints,
    totalLossDb: totalLoss,
    rxPowerDbm: power,
    totalDistanceMeters,
  }
}
