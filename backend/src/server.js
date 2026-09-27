import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { checkDatabase } from './db.js'
import { login, register, requireAuth } from './auth.js'
import { createProject, listProjects } from './projects.js'
import { createLink, createNode, deleteLink, deleteNode, getNetwork, updateNode } from './network.js'

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
      authConfigured: Boolean(process.env.JWT_SECRET),
      database,
    })
  } catch (error) {
    res.status(503).json({
      ok: false,
      service: 'ftth-backend',
      authConfigured: Boolean(process.env.JWT_SECRET),
      error: error.message,
    })
  }
})

app.post('/api/auth/register', register)
app.post('/api/auth/login', login)

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ ok: true, user: req.user })
})

app.get('/api/projects', requireAuth, listProjects)
app.post('/api/projects', requireAuth, createProject)

app.get('/api/projects/:projectId/network', requireAuth, getNetwork)
app.post('/api/projects/:projectId/nodes', requireAuth, createNode)
app.patch('/api/projects/:projectId/nodes/:nodeId', requireAuth, updateNode)
app.delete('/api/projects/:projectId/nodes/:nodeId', requireAuth, deleteNode)
app.post('/api/projects/:projectId/links', requireAuth, createLink)
app.delete('/api/projects/:projectId/links/:linkId', requireAuth, deleteLink)

app.use((error, _req, res, _next) => {
  console.error('UNHANDLED_REQUEST_ERROR', error)
  if (res.headersSent) return
  res.status(500).json({
    ok: false,
    error: error?.message || 'Error interno del servidor.',
  })
})

process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT_EXCEPTION', error)
})

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED_REJECTION', reason)
})

app.listen(port, () => {
  console.log(`FTTH backend listening on http://localhost:${port}`)
})
