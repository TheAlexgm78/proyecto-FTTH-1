import { pool } from './db.js'

function projectDto(row) {
  return {
    id: Number(row.id),
    name: row.name,
    description: row.description || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export async function listProjects(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, name, description, created_at, updated_at
       FROM projects
       WHERE owner_user_id = $1
       ORDER BY updated_at DESC, id DESC`,
      [req.user.id],
    )

    return res.json({ ok: true, projects: result.rows.map(projectDto) })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ ok: false, error: 'No se pudieron cargar los proyectos.' })
  }
}

export async function createProject(req, res) {
  const name = String(req.body?.name || '').trim()
  const description = String(req.body?.description || '').trim()

  if (name.length < 2) {
    return res.status(400).json({ ok: false, error: 'El proyecto necesita un nombre.' })
  }

  try {
    const result = await pool.query(
      `INSERT INTO projects (owner_user_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING id, name, description, created_at, updated_at`,
      [req.user.id, name, description || null],
    )

    return res.status(201).json({ ok: true, project: projectDto(result.rows[0]) })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ ok: false, error: 'No se pudo crear el proyecto.' })
  }
}
