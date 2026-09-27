import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { checkDatabase } from './db.js'

const app = express()
const port = Number(process.env.PORT || 3001)

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
}))
app.use(express.json())

app.get('/api/health', async (_req, res) => {
  try {
    const database = await checkDatabase()
    res.json({
      ok: true,
      service: 'ftth-backend',
      database,
    })
  } catch (error) {
    res.status(503).json({
      ok: false,
      service: 'ftth-backend',
      error: error.message,
    })
  }
})

app.listen(port, () => {
  console.log(`FTTH backend listening on http://localhost:${port}`)
})
