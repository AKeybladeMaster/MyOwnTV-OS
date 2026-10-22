param([switch]$BuildOnly)
$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    & npm.cmd test
    if ($LASTEXITCODE -ne 0) { throw 'Tests failed.' }
    & npm.cmd run package
    if ($LASTEXITCODE -ne 0) { throw 'Packaging or IPK verification failed.' }
    if (-not $BuildOnly) {
        & node tools/tv.mjs backup
        if ($LASTEXITCODE -ne 0) { throw 'No valid baseline; the TV has not been changed.' }
        & node tools/tv.mjs install
        if ($LASTEXITCODE -ne 0) { throw 'Installation did not complete; inspect the TV and the local deployment record.' }
    }
} finally { Pop-Location }
