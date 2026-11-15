<#
  Crea la versión ejecutable de COLSAGRACO para Windows.

  Uso (desde la carpeta colsagraco-react, en PowerShell):
    .\scripts\crear-ejecutable.ps1

  Resultado:
    release\COLSAGRACO\              carpeta lista para copiar a otro PC
    release\COLSAGRACO-v1.0.zip      la misma carpeta comprimida

  Requisitos en el PC donde se use: Node.js 22 o superior y MySQL 8.
#>
$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot
$release = Join-Path $raiz 'release'
$destino = Join-Path $release 'COLSAGRACO'

Write-Host '1/5 Compilando la página web...' -ForegroundColor Cyan
Push-Location $raiz
npm run build | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Falló la compilación de la página (npm run build)' }
Pop-Location

Write-Host '2/5 Copiando archivos...' -ForegroundColor Cyan
if (Test-Path $destino) { Remove-Item $destino -Recurse -Force }
New-Item -ItemType Directory -Path $destino | Out-Null
Copy-Item (Join-Path $raiz 'dist') (Join-Path $destino 'dist') -Recurse
robocopy (Join-Path $raiz 'servidor') (Join-Path $destino 'servidor') /E /NFL /NDL /NJH /NJS /NP `
    /XD node_modules pruebas /XF .env *.log | Out-Null
if ($LASTEXITCODE -ge 8) { throw 'Error copiando el servidor' }

Write-Host '3/5 Instalando librerías del servidor (solo producción)...' -ForegroundColor Cyan
Push-Location (Join-Path $destino 'servidor')
npm ci --omit=dev --no-fund --no-audit | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Falló npm ci en el servidor' }
Pop-Location

Write-Host '4/5 Creando accesos directos...' -ForegroundColor Cyan
$iniciar = @'
@echo off
title COLSAGRACO - Servidor
cd /d "%~dp0servidor"
where node >nul 2>nul || (echo Necesitas instalar Node.js: https://nodejs.org & pause & exit /b 1)
if not exist .env (
  copy .env.example .env >nul
  echo Primera vez: escribe la contrasena de MySQL en el archivo .env y guarda.
  notepad .env
)
echo Iniciando COLSAGRACO en http://localhost:3000
echo Para detenerlo, cierra esta ventana.
start "" http://localhost:3000
node --env-file-if-exists=.env server.js
pause
'@
$preparar = @'
@echo off
title COLSAGRACO - Preparar base de datos
cd /d "%~dp0servidor"
where node >nul 2>nul || (echo Necesitas instalar Node.js: https://nodejs.org & pause & exit /b 1)
if not exist .env (
  copy .env.example .env >nul
  echo Escribe la contrasena de MySQL en el archivo .env, guarda y cierra el Bloc de notas.
  notepad .env
)
node --env-file-if-exists=.env preparar-bd.js
pause
'@
$leeme = @'
COLSAGRACO - Plataforma educativa
Colegio Departamental Integrado Sagrado Corazon de Jesus (Albania, Santander)
=========================================================================

REQUISITOS
  - Node.js 22 o superior (https://nodejs.org)
  - MySQL 8 encendido

PRIMERA VEZ
  1. Doble clic en PREPARAR-BASE-DE-DATOS.bat
     (pide la contrasena de MySQL y crea la base "colsagraco" con sus tablas
      y las cuentas de prueba).
  2. Doble clic en INICIAR-COLSAGRACO.bat
     Se abre el navegador en http://localhost:3000

CUENTAS DE PRUEBA (usuario = documento)
  Estudiante     1000000001   prueba10
  Docente        2000000002   prueba20
  Administrador  3000000003   prueba30

CONTENIDO
  dist\       pagina web compilada (React)
  servidor\   API (Node.js + Express) que tambien entrega la pagina
'@
Set-Content -Path (Join-Path $destino 'INICIAR-COLSAGRACO.bat') -Value $iniciar -Encoding ASCII
Set-Content -Path (Join-Path $destino 'PREPARAR-BASE-DE-DATOS.bat') -Value $preparar -Encoding ASCII
Set-Content -Path (Join-Path $destino 'LEEME.txt') -Value $leeme -Encoding ASCII

Write-Host '5/5 Comprimiendo...' -ForegroundColor Cyan
$zip = Join-Path $release 'COLSAGRACO-v1.0.zip'
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path $destino -DestinationPath $zip
$mb = [math]::Round((Get-Item $zip).Length / 1MB, 1)
Write-Host "Listo: $zip ($mb MB)" -ForegroundColor Green
