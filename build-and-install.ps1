param([switch]$BuildOnly, [switch]$Update)
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
        if ($Update) {
            & node tools/inspect-app.mjs --name ('before-update-' + [DateTime]::UtcNow.ToString('yyyyMMdd-HHmmss')) --assert-rendered --export-preferences
            if ($LASTEXITCODE -ne 0) { throw 'Open MyOwnTV first. No update is allowed without an export of its preferences.' }
            & node tools/tv.mjs install --update
        } else {
            & node tools/tv.mjs install
        }
        if ($LASTEXITCODE -ne 0) { throw 'Installation did not complete; inspect the TV and the local deployment record.' }
    }
} finally { Pop-Location }
