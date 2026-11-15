# Despliegue de COLSAGRACO en la nube (gratis)

La aplicación se publica como **un solo servicio**: el servidor Express entrega la página React compilada y la API.

| Capa | Servicio | Plan |
|---|---|---|
| Aplicación (página + API) | [Render](https://render.com) – Web Service | Free |
| Base de datos (compatible con MySQL) | [TiDB Cloud](https://tidbcloud.com) – Starter | Gratis |

> El plan gratuito de Render "duerme" el servicio tras 15 minutos sin visitas. La primera visita después tarda unos 50 segundos en despertar; luego funciona normal.

---

## Paso 1. Crear la base de datos en TiDB Cloud

1. Entra a https://tidbcloud.com y crea una cuenta (puedes usar tu cuenta de GitHub o Google).
2. Crea un clúster **Starter** (gratis). Región: **AWS – Oregon (us-west-2)**, cerca del servidor de Render.
3. Abre el clúster y haz clic en **Connect**:
   - Connect With: **General**
   - Haz clic en **Generate Password** y **guárdala** (solo se muestra una vez).
   - Anota: **HOST**, **PORT** (4000) y **USERNAME** (algo como `xxxxxxx.root`).
4. En el clúster, abre **SQL Editor** y ejecuta:
   ```sql
   CREATE DATABASE colsagraco;
   ```

## Paso 2. Crear las tablas en la nube desde tu PC

1. En la carpeta `servidor`, crea el archivo **`.env.nube`** (Git lo ignora, no se sube) con los datos del paso 1:
   ```
   DB_HOST=gateway01.us-west-2.prod.aws.tidbcloud.com
   DB_PORT=4000
   DB_USER=xxxxxxx.root
   DB_PASSWORD=la-contraseña-generada
   DB_NAME=colsagraco
   DB_SSL=true
   ```
2. En Git Bash:
   ```
   cd /c/Users/danie/colsagraco-react/servidor
   npm run preparar-bd:nube
   ```
   Debe terminar con **¡Base de datos lista!** y crear las 3 cuentas de prueba.

## Paso 3. Publicar en Render

1. Sube los últimos cambios a GitHub (`git push`).
2. Entra a https://render.com y crea una cuenta **con tu GitHub**.
3. **New → Blueprint** → elige el repositorio **COLSAGRACO**. Render lee el archivo `render.yaml`.
4. Render pide los valores de las variables. Escribe los mismos del archivo `.env.nube`:
   `DB_HOST`, `DB_PORT` (4000), `DB_USER`, `DB_PASSWORD`, `DB_NAME` (colsagraco).
   Deja `DB_SSL_CA` **vacío** (TiDB usa un certificado público que Node ya reconoce).
5. Clic en **Apply**. La primera publicación tarda unos 3–5 minutos.
6. Cuando termine verás la URL, por ejemplo **https://colsagraco.onrender.com**.

## Paso 4. Comprobar

| Qué abrir | Qué debe salir |
|---|---|
| `https://TU-URL.onrender.com/api/salud` | `{"estado":"ok","baseDeDatos":"conectada",...}` |
| `https://TU-URL.onrender.com` | La pantalla de inicio de COLSAGRACO |
| Ingresar con `1000000001` / `prueba10` | El portal del estudiante |

Para probar la API en línea con Postman: duplica el entorno **COLSAGRACO Local**, llámalo **COLSAGRACO Nube** y cambia `baseUrl` por la URL de Render.

## URLs para entregar

| Módulo | URL |
|---|---|
| Aplicación web (inicio de sesión y portales) | `https://TU-URL.onrender.com` |
| API REST (base) | `https://TU-URL.onrender.com/api` |
| Estado del servicio | `https://TU-URL.onrender.com/api/salud` |
| Repositorio | https://github.com/pinedadan514/COLSAGRACO |

Cada vez que hagas `git push` a la rama `main`, Render vuelve a publicar la aplicación automáticamente.
