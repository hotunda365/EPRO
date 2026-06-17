#!/usr/bin/env pwsh
# Download EproTel/ETS logo into project assets folder
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$destFolder = Resolve-Path -Path (Join-Path $scriptDir '..\assets') -ErrorAction SilentlyContinue
if (-not $destFolder) {
  $destFolderPath = Join-Path $scriptDir '..\assets'
  New-Item -ItemType Directory -Path $destFolderPath -Force | Out-Null
  $destFolder = Resolve-Path $destFolderPath
}
$uri = 'https://etsgroup.com.hk/ct/images/top-logo.gif'
$dest = Join-Path $destFolder 'top-logo.gif'
Write-Host "Downloading $uri -> $dest"
try {
  Invoke-WebRequest -Uri $uri -OutFile $dest -UseBasicParsing -ErrorAction Stop
  Write-Host "Done: $dest"
} catch {
  Write-Error "下載失敗：$($_.Exception.Message)"
  exit 1
}
