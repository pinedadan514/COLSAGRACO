<#
  Arma la carpeta comprimida de la entrega de la evidencia.

  Uso (desde la carpeta colsagraco-react, en PowerShell):
    .\scripts\crear-entrega.ps1
    .\scripts\crear-entrega.ps1 -Nombre "ANGY_PINEDA" -Evidencia "GA8-220501096-AA1-EV01"

  Crea en el Escritorio el archivo <Nombre>_<Evidencia>.zip con:
    - Proyecto_COLSAGRACO\   código fuente (sin node_modules, dist, .git ni contraseñas)
    - Documentos de la evidencia (Word)
    - Ejecutable COLSAGRACO-v1.0.zip
    - URLS_Y_REPOSITORIO.txt
#>
param(
    [string]$Nombre = 'ANGY_PINEDA',
    [string]$Evidencia = 'GA8-220501096-AA1-EV01',
    [string[]]$Documentos = @('Modulos colsagraco.docx', 'Pruebas unitarias.docx')
)

$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot
$nombreEntrega = "${Nombre}_${Evidencia}"
$temporal = Join-Path $env:TEMP $nombreEntrega
if (Test-Path $temporal) { Remove-Item $temporal -Recurse -Force }
New-Item -ItemType Directory -Path $temporal | Out-Null

# 1. Código fuente
Write-Host '1/4 Copiando el código fuente...' -ForegroundColor Cyan
robocopy $raiz (Join-Path $temporal 'Proyecto_COLSAGRACO') /E /NFL /NDL /NJH /NJS /NP `
    /XD node_modules dist release coverage .git .claude `
    /XF .env .env.nube *.log | Out-Null
if ($LASTEXITCODE -ge 8) { throw 'Error copiando el proyecto' }

# 2. Documentos
Write-Host '2/4 Copiando los documentos...' -ForegroundColor Cyan
foreach ($doc in $Documentos) {
    $ruta = Join-Path $raiz "docs\$doc"
    if (-not (Test-Path $ruta)) { throw "No se encontró el documento: $ruta" }
    Copy-Item $ruta $temporal
}

# 3. Ejecutable (se crea si no existe)
Write-Host '3/4 Agregando el ejecutable...' -ForegroundColor Cyan
$ejecutable = Join-Path $raiz 'release\COLSAGRACO-v1.0.zip'
if (-not (Test-Path $ejecutable)) { & (Join-Path $PSScriptRoot 'crear-ejecutable.ps1') }
Copy-Item $ejecutable $temporal

# 4. URLs y repositorio
$urls = @"
COLSAGRACO - Plataforma educativa
Evidencia: $Evidencia

URLS DONDE ESTAN DESPLEGADOS LOS MODULOS
  Aplicacion web (acceso y portales):  https://colsagraco.onrender.com
  API REST:                            https://colsagraco.onrender.com/api
  Estado del servicio:                 https://colsagraco.onrender.com/api/salud

REPOSITORIO (GIT)
  https://github.com/pinedadan514/COLSAGRACO

CUENTAS DE PRUEBA (usuario = numero de documento)
  Estudiante     1000000001   prueba10
  Docente        2000000002   prueba20
  Administrador  3000000003   prueba30

NOTA: el servicio gratuito se suspende tras 15 minutos sin visitas;
la primera visita puede tardar unos 50 segundos en cargar.
"@
Set-Content -Path (Join-Path $temporal 'URLS_Y_REPOSITORIO.txt') -Value $urls -Encoding UTF8

Write-Host '4/4 Comprimiendo...' -ForegroundColor Cyan
$zip = Join-Path ([Environment]::GetFolderPath('Desktop')) "$nombreEntrega.zip"
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path (Join-Path $temporal '*') -DestinationPath $zip
Remove-Item $temporal -Recurse -Force
$mb = [math]::Round((Get-Item $zip).Length / 1MB, 1)
Write-Host "Listo: $zip ($mb MB)" -ForegroundColor Green
