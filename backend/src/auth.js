import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { pool } from './db.js'

function getJwtSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET no está configurado en backend/.env')
  }
  return secret
}

function publicUser(row) {
  return {
    id: Number(row.id),
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    createdAt: row.created_at,
  }
}

function signToken(user) {
  return jwt.sign(
    {
      sub: String(user.id),
      email: user.email,
      role: user.role,
    },
    getJwtSecret(),
    { expiresIn: '8h' },
  )
}

export async function register(req, res) {
  const email = String(req.body?.email || '').trim().toLowerCase()
  const displayName = String(req.body?.displayName || '').trim()
  const password = String(req.body?.password || '')

  if (!email || !email.includes('@')) {
    return res.status(400).json({ ok: false, error: 'Correo inválido.' })
  }
  if (displayName.length < 2) {
    return res.status(400).json({ ok: false, error: 'Escribe tu nombre.' })
  }
  if (password.length < 8) {
    return res.status(400).json({ ok: false, error: 'La contraseña debe tener al menos 8 caracteres.' })
  }
  if (bcrypt.truncates(password)) {
    return res.status(400).json({ ok: false, error: 'La contraseña es demasiado larga para bcrypt.' })
  }

  try {
    getJwtSecret()
    const passwordHash = await bcrypt.hash(password, 12)
    const result = await pool.query(
      `INSERT INTO app_users (email, password_hash, display_name, role)
       VALUES ($1, $2, $3, 'admin')
       RETURNING id, email, display_name, role, created_at`,
      [email, passwordHash, displayName],
    )

    const user = publicUser(result.rows[0])
    return res.status(201).json({ ok: true, token: signToken(user), user })
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ ok: false, error: 'Ese correo ya está registrado.' })
    }
    console.error(error)
    return res.status(500).json({ ok: false, error: error.message })
  }
}

export async function login(req, res) {
  const email = String(req.body?.email || '').trim().toLowerCase()
  const password = String(req.body?.password || '')

  try {
    getJwtSecret()
    const result = await pool.query(
      `SELECT id, email, password_hash, display_name, role, created_at
       FROM app_users
       WHERE email = $1
       LIMIT 1`,
      [email],
    )

    const row = result.rows[0]
    if (!row?.password_hash || !(await bcrypt.compare(password, row.password_hash))) {
      return res.status(401).json({ ok: false, error: 'Correo o contraseña incorrectos.' })
    }

    const user = publicUser(row)
    return res.json({ ok: true, token: signToken(user), user })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ ok: false, error: error.message })
  }
}

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || ''
    const [scheme, token] = header.split(' ')

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ ok: false, error: 'Token requerido.' })
    }

    const payload = jwt.verify(token, getJwtSecret())
    const result = await pool.query(
      `SELECT id, email, display_name, role, created_at
       FROM app_users
       WHERE id = $1
       LIMIT 1`,
      [payload.sub],
    )

    if (!result.rows[0]) {
      return res.status(401).json({ ok: false, error: 'Usuario no encontrado.' })
    }

    req.user = publicUser(result.rows[0])
    return next()
  } catch (_error) {
    return res.status(401).json({ ok: false, error: 'Sesión inválida o vencida.' })
  }
}
