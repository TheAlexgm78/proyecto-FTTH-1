export function db(value) {
  return Number(value || 0)
}

export function fiberLoss(distanceMeters, attenuationDbPerKm) {
  return (Number(distanceMeters || 0) / 1000) * Number(attenuationDbPerKm || 0)
}

export function splitterLoss(outputs, excessLossDb = 1) {
  const n = Math.max(1, Number(outputs || 1))
  return 10 * Math.log10(n) + Number(excessLossDb || 0)
}

export function calculateBudget(config) {
  const tx = Number(config.txPowerDbm || 0)
  const feeder = fiberLoss(config.feederMeters, config.attenuationDbPerKm)
  const distribution = fiberLoss(config.distributionMeters, config.attenuationDbPerKm)
  const drop = fiberLoss(config.dropMeters, config.attenuationDbPerKm)
  const splice1 = Number(config.splice1Db || 0)
  const splice2 = Number(config.splice2Db || 0)
  const connectorLoss = Number(config.connectorCount || 0) * Number(config.connectorLossDb || 0)
  const split = splitterLoss(config.splitterOutputs, config.splitterExcessDb)

  const checkpoints = []
  let power = tx
  checkpoints.push({ id: 'olt', label: 'Salida OLT', powerDbm: power, lossDb: 0 })

  power -= feeder
  checkpoints.push({ id: 'feeder', label: 'Después del feeder', powerDbm: power, lossDb: feeder })

  power -= splice1
  checkpoints.push({ id: 'mufa', label: 'Después del empalme 1', powerDbm: power, lossDb: splice1 })

  power -= distribution
  checkpoints.push({ id: 'distribution', label: 'Después de distribución', powerDbm: power, lossDb: distribution })

  power -= split
  checkpoints.push({ id: 'splitter', label: `Salida splitter 1:${Math.max(1, Number(config.splitterOutputs || 1))}`, powerDbm: power, lossDb: split })

  power -= splice2
  checkpoints.push({ id: 'nap', label: 'Después del empalme 2 / NAP', powerDbm: power, lossDb: splice2 })

  power -= drop
  checkpoints.push({ id: 'drop', label: 'Después del drop', powerDbm: power, lossDb: drop })

  power -= connectorLoss
  checkpoints.push({ id: 'ont', label: 'Entrada ONT', powerDbm: power, lossDb: connectorLoss })

  return {
    checkpoints,
    totalLossDb: tx - power,
    rxPowerDbm: power,
    losses: { feeder, distribution, drop, splice1, splice2, connectorLoss, split },
  }
}
