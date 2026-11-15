# COLSAGRACO – Plataforma educativa

Aplicación web del **Colegio Departamental Integrado Sagrado Corazón de Jesús** (Albania, Santander) con portales para **estudiantes**, **docentes** y **administración**.

| Portal | Funciones |
|---|---|
| Estudiante | Materias y notas, calendario académico, tareas, asistencia, solicitudes de permiso, comunicados, chat con profesores, perfil |
| Docente | Elegir materias y grados (6° a 11°), registrar notas y asistencia, publicar tareas, eventos y comunicados, chat con estudiantes |
| Administrador | Cargar estudiantes desde Excel, crear docentes, restablecer contraseñas |

Las cuentas se crean desde un Excel: el usuario es el **número de documento** y la contraseña inicial es el **primer apellido + los dos primeros números del documento** (se cambia en el primer ingreso). La contraseña se recupera con un **PIN por SMS**.

## Tecnologías

| Capa | Tecnología |
|---|---|
| Presentación | React 19 + Vite 8 |
| API REST | Node.js 24 + Express 5 |
| Datos | MySQL 8/9 (local) · TiDB Cloud (producción) |
| Pruebas | node:test + supertest (servidor) · Vitest + Testing Library (página) |

## Estructura

```
src/            Página web (React)
  comun/        Componentes reutilizables (Marco, Chat, CambiarClaveForm…)
  plataforma/   Portal del estudiante
  docente/      Portal del docente
  admin/        Panel del administrador
  pruebas/      Pruebas unitarias de la página
servidor/       API (Express)
  rutas/        Módulos: cuenta, estudiante, docente, mensajes, admin
  pruebas/      Pruebas unitarias del servidor
postman/        Colección de Postman
docs/           Documentación (ENDPOINTS, despliegue, módulos, pruebas)
scripts/        Script para crear el ejecutable
```

## Ejecutar en el PC

Requisitos: Node.js 22+ y MySQL encendido.

```bash
npm install
cd servidor
npm install
cp .env.example .env          # escribir la contraseña de MySQL en .env
npm run preparar-bd           # crea la base "colsagraco", tablas y cuentas de prueba
npm start                     # API en http://localhost:3000
```

En otra terminal, desde la raíz: `npm run dev` y abrir http://localhost:5173

Cuentas de prueba: estudiante `1000000001`/`prueba10`, docente `2000000002`/`prueba20`, administrador `3000000003`/`prueba30`.

## Pruebas

```bash
npm test                      # página web (54 pruebas)
cd servidor && npm test       # servidor (103 pruebas, usa la base colsagraco_test)
npm run lint                  # revisión de código
```

## Despliegue y ejecutable

- Nube (Render + TiDB Cloud): ver [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md) y `render.yaml`.
- Ejecutable para Windows: `.\scripts\crear-ejecutable.ps1` → `release/COLSAGRACO-v1.0.zip`.

## Documentación

- [ENDPOINTS de la API](docs/ENDPOINTS.md)
- Documentación de módulos y componentes: `docs/Documentacion_modulos_COLSAGRACO.docx`
- Informe de pruebas unitarias: `docs/Informe_pruebas_unitarias_COLSAGRACO.docx`
