param(
    [int]$Port = 55432,
    [string]$Database = 'aanm',
    [string]$User = 'postgres'
)

$ErrorActionPreference = 'Stop'

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot '..')
$localDir = Join-Path $projectRoot '.local'
$dataDir = Join-Path $localDir 'postgres-data'
$logDir = Join-Path $localDir 'logs'
$logFile = Join-Path $logDir 'postgres.log'

function Get-RequiredCommand {
    param([string]$Name)

    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if (-not $command) {
        throw "$Name was not found in PATH. Install PostgreSQL or add its bin folder to PATH."
    }

    return $command.Source
}

function Invoke-RequiredNative {
    param(
        [string]$FilePath,
        [string[]]$Arguments
    )

    & $FilePath @Arguments | Out-Host
    if ($LASTEXITCODE -ne 0) {
        throw "$FilePath failed with exit code $LASTEXITCODE."
    }
}

$initdb = Get-RequiredCommand 'initdb'
$pgCtl = Get-RequiredCommand 'pg_ctl'
$pgIsReady = Get-RequiredCommand 'pg_isready'
$psql = Get-RequiredCommand 'psql'
$createdb = Get-RequiredCommand 'createdb'

New-Item -ItemType Directory -Force -Path $localDir, $logDir | Out-Null

if (-not (Test-Path (Join-Path $dataDir 'PG_VERSION'))) {
    Write-Host "Initializing local PostgreSQL data directory..."
    Invoke-RequiredNative $initdb @('-D', $dataDir, '-U', $User, '--auth=trust', '--encoding=UTF8')
}

& $pgIsReady -h 127.0.0.1 -p $Port -U $User | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Starting local PostgreSQL on port $Port..."
    Invoke-RequiredNative $pgCtl @('-D', $dataDir, '-l', $logFile, '-w', 'start', '-o', "-p $Port -c listen_addresses=127.0.0.1")
}

$databaseExists = & $psql -h 127.0.0.1 -p $Port -U $User -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$Database'"
if ($LASTEXITCODE -ne 0) {
    throw "$psql failed while checking for database '$Database'."
}

if (($databaseExists | Select-Object -First 1).Trim() -ne '1') {
    Write-Host "Creating database '$Database'..."
    Invoke-RequiredNative $createdb @('-h', '127.0.0.1', '-p', "$Port", '-U', $User, $Database)
}

Write-Host "Local PostgreSQL is ready: postgres://$User@127.0.0.1:$Port/$Database"
