<#
  Arma la carpeta comprimida de la evidencia AA5-EV02.

  Uso (desde la carpeta colsagraco-react, en PowerShell):
    .\docs\crear-entrega.ps1 -Nombre "NOMBRE_APELLIDO" -Video "C:\ruta\al\video.mp4"

  Crea en el Escritorio el archivo NOMBRE_APELLIDO_AA5_EV02.zip con:
    - Archivos del proyecto (sin node_modules, dist, .git ni el archivo .env con la contraseña)
    - El video
    - Documento con pruebas, archivo de ENDPOINTS y archivo con el enlace del repositorio
#>
param(
    [Parameter(Mandatory = $true)][string]$Nombre,
    [Parameter(Mandatory = $true)][string]$Video
)

$ErrorActionPreference = 'Stop'
$proyecto = Split-Path -Parent $PSScriptRoot
$nombreEntrega = ($Nombre.Trim().ToUpper() -replace '\s+', '_') + '_AA5_EV02'

if (-not (Test-Path $Video)) { throw "No se encontró el video: $Video" }

$temporal = Join-Path $env:TEMP $nombreEntrega
if (Test-Path $temporal) { Remove-Item $temporal -Recurse -Force }
New-Item -ItemType Directory -Path $temporal | Out-Null

# 1. Archivos del proyecto (robocopy excluye carpetas y archivos que no se entregan)
$destinoProyecto = Join-Path $temporal 'Proyecto_COLSAGRACO'
robocopy $proyecto $destinoProyecto /E /NFL /NDL /NJH /NJS /NP `
    /XD node_modules dist .git .claude `
    /XF .env *.log | Out-Null
if ($LASTEXITCODE -ge 8) { throw 'Error copiando los archivos del proyecto' }

# 2. Video
Copy-Item $Video (Join-Path $temporal ("Video_" + $nombreEntrega + [IO.Path]::GetExtension($Video)))

# 3. Documentos de la entrega (también quedan dentro del proyecto, en docs/)
$docs = Join-Path $proyecto 'docs'
Copy-Item (Join-Path $docs 'Pruebas_API_Postman_AA5_EV02.docx') $temporal
Copy-Item (Join-Path $docs 'ENDPOINTS.docx') $temporal
Copy-Item (Join-Path $docs 'REPOSITORIO.txt') $temporal

# 4. Comprimir
$zip = Join-Path ([Environment]::GetFolderPath('Desktop')) ($nombreEntrega + '.zip')
if (Test-Path $zip) { Remove-Item $zip -Force }
Compress-Archive -Path (Join-Path $temporal '*') -DestinationPath $zip
Remove-Item $temporal -Recurse -Force

$tamano = [math]::Round((Get-Item $zip).Length / 1MB, 1)
Write-Host "Listo: $zip ($tamano MB)" -ForegroundColor Green
