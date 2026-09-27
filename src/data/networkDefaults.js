export const defaultNetwork = {
  olt: { name: 'OLT', port: 'PON 0/1/1', txPowerDbm: 4 },
  odf: { name: 'ODF', port: 12 },
  closure: { name: 'MUFA-001', fibers: 24, buffers: 2 },
  splitter: { ratio: '1:8', lossDb: 10.5 },
  cto: { name: 'CTO-001', ports: 8 },
  ont: { name: 'ONT-001', rxPowerDbm: -18.7 },
}
