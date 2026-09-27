# Base de datos FTTH

La base local usa PostgreSQL + PostGIS mediante Docker.

## Iniciar

Desde la raíz del proyecto:

```powershell
docker compose up -d
```

## Ver estado

```powershell
docker compose ps
```

## Probar PostGIS

```powershell
docker exec -it ftth-postgis psql -U ftth_admin -d ftth_system -c "SELECT PostGIS_Version();"
```

Los scripts dentro de `database/init` se ejecutan automáticamente únicamente cuando se crea un volumen de base de datos nuevo.
