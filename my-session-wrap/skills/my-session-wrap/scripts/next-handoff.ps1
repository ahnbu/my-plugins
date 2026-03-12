param(
    [string]$ProjectRoot = "",
    [string]$Summary = "",
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"

function Sanitize-Summary {
    param([string]$Value)

    if ([string]::IsNullOrWhiteSpace($Value)) {
        return ""
    }

    $trimmed = $Value.Trim()
    $invalid = [System.IO.Path]::GetInvalidFileNameChars()
    $buffer = New-Object System.Collections.Generic.List[char]

    foreach ($ch in $trimmed.ToCharArray()) {
        if ($invalid -contains $ch) {
            [void]$buffer.Add('-')
        } else {
            [void]$buffer.Add($ch)
        }
    }

    $sanitized = -join $buffer.ToArray()
    $sanitized = $sanitized -replace '\s+', '-'
    $sanitized = $sanitized -replace '-{2,}', '-'
    $sanitized = $sanitized.Trim('-')

    return $sanitized
}

function Resolve-ProjectRoot {
    $markers = @("CHANGELOG.md", "AGENTS.md", "CLAUDE.md", "GEMINI.md")

    # Priority 1: explicit -ProjectRoot argument
    if (-not [string]::IsNullOrWhiteSpace($ProjectRoot)) {
        $found = ($markers | Where-Object { Test-Path (Join-Path $ProjectRoot $_) }).Count
        if ($found -eq 0) {
            throw "ProjectRoot '$ProjectRoot' has no marker files (CHANGELOG.md / AGENTS.md / CLAUDE.md / GEMINI.md)."
        }
        if ($Verbose) { Write-Host "RootResolution: explicit(-ProjectRoot)" }
        return $ProjectRoot
    }

    # Priority 2: git root
    try {
        $gitRoot = & git rev-parse --show-toplevel 2>$null
        if ($LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($gitRoot)) {
            if ($Verbose) { Write-Host "RootResolution: git-root" }
            return $gitRoot.Trim()
        }
    } catch {}

    # Priority 3: marker scan — up to 3 levels above CWD, pick folder with most markers
    $current = (Get-Location).Path
    $candidates = @()

    for ($depth = 0; $depth -le 3; $depth++) {
        if ([string]::IsNullOrWhiteSpace($current)) { break }
        $count = ($markers | Where-Object { Test-Path (Join-Path $current $_) }).Count
        if ($count -gt 0) {
            $candidates += [PSCustomObject]@{ Path = $current; Count = $count; Depth = $depth }
        }
        $parent = Split-Path $current -Parent
        if ($parent -eq $current) { break }
        $current = $parent
    }

    if ($candidates.Count -gt 0) {
        # Most markers wins; tie-break by closest (lowest depth)
        $best = $candidates | Sort-Object @{Expression='Count';Descending=$true}, @{Expression='Depth';Descending=$false} | Select-Object -First 1
        if ($Verbose) { Write-Host "RootResolution: marker-scan (markers=$($best.Count), depth=$($best.Depth))" }
        return $best.Path
    }

    # Priority 4: unresolved — throw with git root hint
    $hint = ""
    try {
        $g = & git rev-parse --show-toplevel 2>$null
        if (-not [string]::IsNullOrWhiteSpace($g)) { $hint = " Git root candidate: $($g.Trim())" }
    } catch {}

    throw "ProjectRoot could not be determined. No marker files found within 3 levels above CWD.$hint"
}

# --- Main ---
$resolvedRoot = Resolve-ProjectRoot
$HandoffDir = Join-Path $resolvedRoot "_handoff"

if ($Verbose) {
    Write-Host "ProjectRoot: $resolvedRoot"
    Write-Host "HandoffDir:  $HandoffDir"
}

if (-not (Test-Path -LiteralPath $HandoffDir)) {
    New-Item -ItemType Directory -Path $HandoffDir | Out-Null
}

$date = Get-Date -Format "yyyyMMdd"
$suffix = Sanitize-Summary -Value $Summary

if ([string]::IsNullOrWhiteSpace($suffix)) {
    $suffix = Get-Date -Format "HHmm"
}

if ([string]::IsNullOrWhiteSpace($suffix)) {
    throw "Summary suffix is empty."
}

$pattern = "handoff_${date}_??_*.md"
$maxSeq = 0

Get-ChildItem -LiteralPath $HandoffDir -Filter $pattern -File -ErrorAction SilentlyContinue | ForEach-Object {
    if ($_.Name -match "^handoff_${date}_(\d{2})_.+\.md$") {
        $seq = [int]$Matches[1]
        if ($seq -gt $maxSeq) {
            $maxSeq = $seq
        }
    }
}

$nextSeq = "{0:D2}" -f ($maxSeq + 1)
$newFile = Join-Path $HandoffDir "handoff_${date}_${nextSeq}_${suffix}.md"

if (Test-Path -LiteralPath $newFile) {
    Write-Error "ERROR: $newFile already exists"
    exit 1
}

Write-Output $newFile
