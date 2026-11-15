# ENDPOINTS – API COLSAGRACO

Plataforma educativa del Colegio Departamental Integrado Sagrado Corazón de Jesús (Albania, Santander).

- **URL base (local):** `http://localhost:3000`
- **Formato:** JSON (`Content-Type: application/json`)
- **Autenticación:** después de `POST /api/login`, enviar el encabezado `Authorization: Bearer <token>`
- **Total de endpoints:** 32 (31 de la aplicación + /api/salud)
- **Repositorio:** https://github.com/pinedadan514/COLSAGRACO

## Resumen

| # | Método | Ruta | Acceso |
|---|---|---|---|
| 1 | POST | `/api/login` | Público (sin token) |
| 2 | POST | `/api/logout` | Cualquier usuario con sesión |
| 3 | POST | `/api/cambiar-clave` | Cualquier usuario con sesión |
| 4 | PUT | `/api/cuenta/contacto` | Cualquier usuario con sesión |
| 5 | POST | `/api/recuperar/solicitar` | Público (sin token) |
| 6 | POST | `/api/recuperar/cambiar` | Público (sin token) |
| 7 | GET | `/api/estudiante` | Estudiante |
| 8 | PUT | `/api/estudiante/tareas/:id/entrega` | Estudiante |
| 9 | POST | `/api/estudiante/comunicados/leidos` | Estudiante |
| 10 | POST | `/api/estudiante/permisos` | Estudiante |
| 11 | DELETE | `/api/estudiante/permisos/:id` | Estudiante |
| 12 | GET | `/api/mensajes` | Estudiante o docente |
| 13 | POST | `/api/mensajes` | Estudiante o docente |
| 14 | POST | `/api/mensajes/leidos` | Estudiante o docente |
| 15 | GET | `/api/docente` | Docente |
| 16 | PUT | `/api/docente/asignaciones` | Docente |
| 17 | GET | `/api/docente/clase?materia=mat&grado=10&fecha=2026-11-14` | Docente |
| 18 | PUT | `/api/docente/notas` | Docente |
| 19 | PUT | `/api/docente/asistencia` | Docente |
| 20 | POST | `/api/docente/tareas` | Docente |
| 21 | DELETE | `/api/docente/tareas/:id` | Docente |
| 22 | POST | `/api/docente/eventos` | Docente |
| 23 | DELETE | `/api/docente/eventos/:id` | Docente |
| 24 | POST | `/api/docente/comunicados` | Docente |
| 25 | DELETE | `/api/docente/comunicados/:id` | Docente |
| 26 | GET | `/api/admin` | Administrador |
| 27 | GET | `/api/admin/estudiantes?grado=10` | Administrador |
| 28 | GET | `/api/admin/plantilla` | Administrador |
| 29 | POST | `/api/admin/importar` | Administrador |
| 30 | POST | `/api/admin/docentes` | Administrador |
| 31 | POST | `/api/admin/usuarios/:id/restablecer` | Administrador |

## Cuenta e inicio de sesión

### 1. POST `/api/login`

Inicia sesión con el número de documento y la contraseña. Devuelve el token de sesión (válido 12 horas) y los datos del usuario.

- **Acceso:** Público (sin token)
- **Cuerpo (JSON):**

```json
{
  "documento": "1000000001",
  "contrasena": "prueba10"
}
```

- **Respuestas:**
  - 200: { token, usuario: { id, documento, rol, nombre, debeCambiarClave } }
  - 400: faltan datos
  - 401: documento o contraseña incorrectos
  - 429: demasiados intentos (10 cada 15 minutos)

### 2. POST `/api/logout`

Cierra la sesión: el token deja de funcionar.

- **Acceso:** Cualquier usuario con sesión
- **Respuestas:**
  - 200: { mensaje: "Sesión cerrada" }

### 3. POST `/api/cambiar-clave`

Cambia la contraseña. Es obligatorio en el primer ingreso (contraseña inicial).

- **Acceso:** Cualquier usuario con sesión
- **Cuerpo (JSON):**

```json
{
  "actual": "perez10",
  "nueva": "MiClaveNueva2026"
}
```

- **Respuestas:**
  - 200: contraseña actualizada
  - 400: la actual no es correcta o la nueva tiene menos de 6 caracteres

### 4. PUT `/api/cuenta/contacto`

Actualiza celular, correo y dirección del usuario. El celular se usa para enviar el PIN de recuperación.

- **Acceso:** Cualquier usuario con sesión
- **Cuerpo (JSON):**

```json
{
  "celular": "3001234567",
  "correo": "estudiante@correo.com",
  "direccion": "Albania, Santander"
}
```

- **Respuestas:**
  - 200: { celular, correo, direccion }
  - 400: celular o correo no válidos

### 5. POST `/api/recuperar/solicitar`

Envía por SMS un PIN de 6 números al celular del estudiante (o del acudiente si no tiene). Vence en 10 minutos.

- **Acceso:** Público (sin token)
- **Cuerpo (JSON):**

```json
{
  "documento": "1000000001"
}
```

- **Respuestas:**
  - 200: { mensaje: "Enviamos un PIN ... al celular *** *** 0001", minutos: 10 }
  - 400: la cuenta no tiene celular
  - 404: documento no registrado
  - 429: más de 3 solicitudes en 15 minutos

### 6. POST `/api/recuperar/cambiar`

Cambia la contraseña usando el PIN recibido. Máximo 5 intentos por PIN; al cambiarla se cierran todas las sesiones.

- **Acceso:** Público (sin token)
- **Cuerpo (JSON):**

```json
{
  "documento": "1000000001",
  "pin": "123456",
  "nueva": "MiClaveNueva2026"
}
```

- **Respuestas:**
  - 200: contraseña cambiada
  - 400: PIN incorrecto, vencido o ya usado

## Plataforma del estudiante

### 7. GET `/api/estudiante`

Toda la información del estudiante: perfil, materias con nota, tareas, eventos, asistencia, novedades, comunicados, mensajes, docentes y permisos.

- **Acceso:** Estudiante
- **Respuestas:**
  - 200: { usuario, perfil, materias, tareas, eventos, asistencia, novedades, comunicados, mensajes, docentes, permisos, tiposPermiso }

### 8. PUT `/api/estudiante/tareas/:id/entrega`

Marca o desmarca una tarea de su grado como entregada.

- **Acceso:** Estudiante
- **Cuerpo (JSON):**

```json
{
  "entregada": true
}
```

- **Respuestas:**
  - 200: { id, entregada }
  - 404: la tarea no existe o no es de su grado

### 9. POST `/api/estudiante/comunicados/leidos`

Marca comunicados como leídos. Sin "ids" marca todos.

- **Acceso:** Estudiante
- **Cuerpo (JSON):**

```json
{
  "ids": [
    1,
    2
  ]
}
```

- **Respuestas:**
  - 200: comunicados marcados como leídos

### 10. POST `/api/estudiante/permisos`

Crea una solicitud de permiso. Tipos: Cita médica, Calamidad doméstica, Actividad deportiva o cultural, Viaje familiar, Otro.

- **Acceso:** Estudiante
- **Cuerpo (JSON):**

```json
{
  "tipo": "Cita médica",
  "desde": "2026-11-20",
  "hasta": "2026-11-20",
  "motivo": "Cita con el odontólogo en Bucaramanga."
}
```

- **Respuestas:**
  - 201: la solicitud creada, con estado "En revisión"
  - 400: tipo, fechas o motivo no válidos

### 11. DELETE `/api/estudiante/permisos/:id`

Cancela una solicitud propia que siga en revisión.

- **Acceso:** Estudiante
- **Respuestas:**
  - 200: solicitud cancelada
  - 404: no existe o ya fue revisada

## Chat entre estudiantes y docentes

### 12. GET `/api/mensajes`

Lista los mensajes del usuario (la plataforma lo consulta cada 15 segundos).

- **Acceso:** Estudiante o docente
- **Respuestas:**
  - 200: [ { id, estudianteId, docenteId, remitente, texto, leido, fecha } ]

### 13. POST `/api/mensajes`

Envía un mensaje. "para" es el id del otro usuario. Un estudiante solo escribe a docentes de su grado; un docente, a estudiantes de sus grados.

- **Acceso:** Estudiante o docente
- **Cuerpo (JSON):**

```json
{
  "para": 2,
  "texto": "Profe, ¿el taller es en grupo?"
}
```

- **Respuestas:**
  - 201: el mensaje creado
  - 400: mensaje vacío o de más de 1000 caracteres
  - 403: no puede escribir a ese usuario

### 14. POST `/api/mensajes/leidos`

Marca como leídos los mensajes recibidos de una persona.

- **Acceso:** Estudiante o docente
- **Cuerpo (JSON):**

```json
{
  "con": 2
}
```

- **Respuestas:**
  - 200: mensajes leídos

## Plataforma del docente

### 15. GET `/api/docente`

Información del docente: perfil, catálogo de materias, sus asignaciones (materia + grado), las ocupadas por otros docentes, tareas, eventos, comunicados, estudiantes y mensajes.

- **Acceso:** Docente
- **Respuestas:**
  - 200: { usuario, perfil, materias, asignaciones, ocupadas, tareas, eventos, comunicados, estudiantes, mensajes, categorias }

### 16. PUT `/api/docente/asignaciones`

Guarda las materias que dicta y los grados (6 a 11) de cada una. Reemplaza las anteriores. Una materia en un grado solo puede tenerla un docente.

- **Acceso:** Docente
- **Cuerpo (JSON):**

```json
{
  "asignaciones": [
    {
      "materiaId": "mat",
      "grado": 10
    },
    {
      "materiaId": "fis",
      "grado": 10
    }
  ]
}
```

- **Respuestas:**
  - 200: { asignaciones }
  - 400: grado o materia no válidos
  - 409: esa materia en ese grado ya la dicta otro docente

### 17. GET `/api/docente/clase?materia=mat&grado=10&fecha=2026-11-14`

Estudiantes de una clase con su nota y, si se envía fecha, su asistencia de ese día.

- **Acceso:** Docente
- **Respuestas:**
  - 200: [ { id, nombre, documento, nota, estado, observacion } ]
  - 403: no tiene asignada esa materia en ese grado

### 18. PUT `/api/docente/notas`

Registra notas de 1.0 a 5.0. Una nota vacía (null) la borra.

- **Acceso:** Docente
- **Cuerpo (JSON):**

```json
{
  "materiaId": "mat",
  "grado": 10,
  "notas": [
    {
      "estudianteId": 1,
      "nota": 4.5
    }
  ]
}
```

- **Respuestas:**
  - 200: { mensaje: "Se guardaron N notas" }
  - 400: nota fuera de 1.0 a 5.0
  - 403: materia o grado no asignados

### 19. PUT `/api/docente/asistencia`

Registra la asistencia de un día. Estados: Presente, Falta, Tardanza, Excusa. Si ya existía, la corrige.

- **Acceso:** Docente
- **Cuerpo (JSON):**

```json
{
  "materiaId": "mat",
  "grado": 10,
  "fecha": "2026-11-14",
  "registros": [
    {
      "estudianteId": 1,
      "estado": "Tardanza",
      "observacion": "10 minutos tarde"
    }
  ]
}
```

- **Respuestas:**
  - 200: { mensaje: "Asistencia guardada para N estudiantes" }
  - 400: fecha futura o estado no válido
  - 403: materia o grado no asignados

### 20. POST `/api/docente/tareas`

Publica una tarea para una materia y grado que dicta.

- **Acceso:** Docente
- **Cuerpo (JSON):**

```json
{
  "materiaId": "mat",
  "grado": 10,
  "titulo": "Taller de fracciones",
  "descripcion": "Ejercicios 1 al 10",
  "fecha": "2026-11-21"
}
```

- **Respuestas:**
  - 201: la tarea creada con su id
  - 400: título o fecha no válidos
  - 403: materia o grado no asignados

### 21. DELETE `/api/docente/tareas/:id`

Elimina una tarea propia.

- **Acceso:** Docente
- **Respuestas:**
  - 200: tarea eliminada
  - 404: no existe o no es suya

### 22. POST `/api/docente/eventos`

Agrega un evento al calendario académico. Tipos: evaluacion, evento, festivo. grado: 6 a 11 o "todos".

- **Acceso:** Docente
- **Cuerpo (JSON):**

```json
{
  "titulo": "Evaluación de periodo",
  "fecha": "2026-11-25",
  "tipo": "evaluacion",
  "grado": 10
}
```

- **Respuestas:**
  - 201: el evento creado
  - 400: título, fecha, tipo o grado no válidos

### 23. DELETE `/api/docente/eventos/:id`

Elimina un evento creado por el docente.

- **Acceso:** Docente
- **Respuestas:**
  - 200: evento eliminado
  - 404: no existe o no lo creó él

### 24. POST `/api/docente/comunicados`

Publica un comunicado para un grado o para todo el colegio. Categorías: Académico, Institucional, Convivencia, Salud, Otro.

- **Acceso:** Docente
- **Cuerpo (JSON):**

```json
{
  "titulo": "Salida pedagógica",
  "categoria": "Académico",
  "grado": "todos",
  "contenido": "El viernes saldremos al parque principal..."
}
```

- **Respuestas:**
  - 201: el comunicado creado
  - 400: datos no válidos

### 25. DELETE `/api/docente/comunicados/:id`

Elimina un comunicado propio.

- **Acceso:** Docente
- **Respuestas:**
  - 200: comunicado eliminado
  - 404: no existe o no es suyo

## Panel del administrador

### 26. GET `/api/admin`

Resumen: estudiantes por grado y docentes con las materias que dictan.

- **Acceso:** Administrador
- **Respuestas:**
  - 200: { usuario, perfil, porGrado, docentes }

### 27. GET `/api/admin/estudiantes?grado=10`

Lista de estudiantes (opcionalmente de un grado) con datos del acudiente.

- **Acceso:** Administrador
- **Respuestas:**
  - 200: [ { id, documento, nombre, grado, celular, acudiente, acudienteCelular, debeCambiarClave } ]

### 28. GET `/api/admin/plantilla`

Descarga la plantilla de Excel (.xlsx) para cargar estudiantes.

- **Acceso:** Administrador
- **Respuestas:**
  - 200: archivo .xlsx

### 29. POST `/api/admin/importar`

Carga estudiantes desde el Excel (enviado en base64). Crea cuentas con la contraseña inicial (primer apellido + 2 primeros números del documento) o actualiza las existentes.

- **Acceso:** Administrador
- **Cuerpo (JSON):**

```json
{
  "archivo": "<contenido del .xlsx en base64>"
}
```

- **Respuestas:**
  - 200: { creados, actualizados, errores: [ { fila, documento, mensaje } ] }
  - 400: el archivo no es un Excel válido o le faltan columnas
  - 413: archivo de más de 12 MB

### 30. POST `/api/admin/docentes`

Crea la cuenta de un docente con la contraseña inicial.

- **Acceso:** Administrador
- **Cuerpo (JSON):**

```json
{
  "documento": "1098765432",
  "nombres": "Marta",
  "primerApellido": "Núñez",
  "segundoApellido": "Ruiz",
  "celular": "3001112233",
  "correo": "marta@correo.com"
}
```

- **Respuestas:**
  - 201: { id, claveInicial }
  - 400: datos incompletos
  - 409: ya existe una cuenta con ese documento

### 31. POST `/api/admin/usuarios/:id/restablecer`

Vuelve la contraseña de un estudiante o docente a la inicial (para quien no tiene celular).

- **Acceso:** Administrador
- **Respuestas:**
  - 200: { clave }
  - 404: el usuario no existe

## Estado del servicio

### GET `/api/salud`

Indica si la aplicación y la base de datos están funcionando (lo usa el hosting).

- **Acceso:** Público (sin token)
- **Respuestas:**
  - 200: { estado: "ok", baseDeDatos: "conectada", version }
  - 503: { estado: "error", baseDeDatos: "sin conexión" }

## Códigos de respuesta

| Código | Nombre | Significado |
|---|---|---|
| 200 | OK | La petición se realizó correctamente. |
| 201 | Creado | Se creó un registro (tarea, evento, comunicado, permiso, mensaje, docente). |
| 400 | Solicitud incorrecta | Faltan datos o no son válidos. El campo "mensaje" explica el problema. |
| 401 | No autorizado | No se envió token, es inválido, expiró, o el documento/contraseña son incorrectos. |
| 403 | Prohibido | El rol no tiene permiso, el usuario debe cambiar su contraseña inicial, o la clase no le pertenece. |
| 404 | No encontrado | La ruta o el registro no existen. |
| 409 | Conflicto | El registro ya existe (documento repetido o materia ocupada por otro docente). |
| 413 | Muy grande | El archivo enviado supera el tamaño permitido. |
| 429 | Demasiadas solicitudes | Demasiados intentos de inicio de sesión o de PIN. Esperar 15 minutos. |
| 500 | Error del servidor | Error interno (por ejemplo, MySQL apagado). |

Todas las respuestas de error tienen la forma `{ "mensaje": "explicación del error" }`.
