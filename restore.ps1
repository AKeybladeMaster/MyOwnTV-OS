param()
$ErrorActionPreference = 'Stop'
Push-Location $PSScriptRoot
try {
    & node tools/tv.mjs restore
    if ($LASTEXITCODE -ne 0) { throw 'Automatic return to LG Home did not finish. Press the physical Home button; native LG Home was never disabled. Read docs/safety-and-restore.md before further changes.' }
} finally { Pop-Location }
