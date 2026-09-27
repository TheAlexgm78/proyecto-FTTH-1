import pg from 'pg'

const { Pool } = pg

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

export async function checkDatabase() {
  const result = await pool.query(
    "SELECT current_database() AS database, PostGIS_Version() AS postgis_version"
  )
  return result.rows[0]
}
