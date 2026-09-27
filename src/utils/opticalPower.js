export function calculateRxPower(txPowerDbm, lossesDb = []) {
  const totalLossDb = lossesDb.reduce((sum, value) => sum + Number(value || 0), 0)
  return {
    totalLossDb,
    rxPowerDbm: Number(txPowerDbm) - totalLossDb,
  }
}
