[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectDir = Split-Path -Parent $ScriptDir
$Version = if ($env:LUMEN_BUILD_VERSION) { $env:LUMEN_BUILD_VERSION } else { "0.1.0-alpha.1" }
$AppDir = Join-Path $ProjectDir "dist\Lumen AI Chat"
$Executable = Join-Path $AppDir "Lumen AI Chat.exe"
$Archive = Join-Path $ProjectDir "dist\Lumen-AI-Chat-$Version-windows-x64.zip"
$Checksum = "$Archive.sha256"

Set-Location $ProjectDir

$Architecture = (python -c "import platform; print(platform.machine().lower())").Trim()
if ($Architecture -notin @("amd64", "x86_64")) {
    throw "The Windows x64 package requires a 64-bit x86 Python runtime; found $Architecture."
}

python "packaging\write_build_metadata.py"
python "packaging\write_windows_icon.py"
python "packaging\write_windows_version.py"
python -m PyInstaller --clean --noconfirm "packaging\lumen_windows.spec"

if (-not (Test-Path -LiteralPath $Executable -PathType Leaf)) {
    throw "PyInstaller did not create $Executable"
}

Remove-Item -LiteralPath $Archive -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $Checksum -Force -ErrorAction SilentlyContinue
$Archived = $false
for ($Attempt = 1; $Attempt -le 5; $Attempt++) {
    try {
        Compress-Archive -LiteralPath $AppDir -DestinationPath $Archive -CompressionLevel Optimal
        $Archived = $true
        break
    }
    catch {
        Remove-Item -LiteralPath $Archive -Force -ErrorAction SilentlyContinue
        if ($Attempt -eq 5) { throw }
        Start-Sleep -Seconds 1
    }
}
if (-not $Archived) {
    throw "Could not create $Archive"
}
$Hash = (Get-FileHash -LiteralPath $Archive -Algorithm SHA256).Hash.ToLowerInvariant()
"$Hash  $(Split-Path -Leaf $Archive)" | Set-Content -LiteralPath $Checksum -Encoding ascii

Write-Output "Created $Archive"
