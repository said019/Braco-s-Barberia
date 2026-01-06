# Guía de Acceso a Base de Datos Remota (Railway)

Esta guía explica cómo conectar tu entorno local a la base de datos de producción en Railway para ejecutar scripts de mantenimiento (limpieza o "semillas").

## 1. Obtener Credenciales de Railway

1. Ve a tu dashboard en [Railway.app](https://railway.app).
2. Entra a tu proyecto y selecciona el servicio de **PostgreSQL**.
3. Ve a la pestaña **Variables**.
4. Busca las variables: `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_PORT`.
   - O copia la `DATABASE_URL` completa si usas una herramienta que la acepte.

## 2. Conexión Directa (pgAdmin, TablePlus, PSQL)

Si solo quieres ver datos o ejecutar SQL manual:
- **Host:** (El valor de `DB_HOST` o `PGHOST`)
- **Port:** (El valor de `DB_PORT` o `PGPORT`)
- **User:** (El valor de `DB_USER` o `PGUSER`)
- **Password:** (El valor de `DB_PASSWORD` o `PGPASSWORD`)
- **Database:** (El valor de `DB_NAME` o `PGDATABASE`)

> **Nota:** Railway suele cerrar conexiones externas públicas. Si no conecta, revisa si tienes habilitado "Public Networking" en la pestaña *Settings* del servicio de base de datos.

## 3. Ejecutar Scripts Locales en Producción

Para correr `node database/clean_memberships.js` o `node database/run_seed.js` contra la base de datos REAL:

1. **Edita temporalmente tu archivo `.env` local**:
   - Comenta tus credenciales locales (`# DB_HOST=localhost`).
   - Pega las credenciales de Railway.

   ```env
   # LOCAL
   # DB_HOST=localhost
   
   # PROD (Railway)
   DB_HOST=containers-us-west-xxx.railway.app
   DB_PORT=6543
   DB_NAME=railway
   DB_USER=postgres
   DB_PASSWORD=tunuevapassword
   ```

2. **Ejecuta el script**:
   - Limpieza (Borrar todo): `node database/clean_memberships.js`
   - Reparación (Insertar membresías): `node database/run_seed.js`

3. **IMPORTANTE: Restaura tu `.env`**:
   - Vuelve a poner `localhost` para no dañar producción mientras desarrollas.

## 3b. Alternativa: Variables en Línea (Terminal)

En lugar de editar el `.env`, puedes pasar las variables directo en el comando (Linux/Mac):

```bash
DB_HOST=tuhost.railway.app DB_PORT=5432 DB_USER=postgres DB_PASSWORD=tupassword DB_NAME=railway node database/clean_memberships.js
```
