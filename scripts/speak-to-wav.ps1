<#
.SYNOPSIS
    Generates WAV audio files from text using Windows built-in TTS (no internet required).

.DESCRIPTION
    Two modes:
      1.  -ListVoices     → Print the name of every installed TTS voice, then exit.
      2.  -SegmentsFile   → Read a JSON array of segment objects and speak each one
                            to its own WAV file using the specified voice and rate.

    Segment object shape:
        {
            "voice":      "Microsoft Huihui Desktop",   // installed TTS voice name
            "rate":       -2,                            // -10 (slow) … 10 (fast), 0 = normal
            "text":       "你好",                         // text to speak
            "outputPath": "C:\\tmp\\hello.wav"           // destination WAV path (dir must exist)
        }

.EXAMPLE
    # List all installed voices:
    powershell -NoProfile -ExecutionPolicy Bypass -File speak-to-wav.ps1 -ListVoices

.EXAMPLE
    # Speak from a segments file:
    powershell -NoProfile -ExecutionPolicy Bypass -File speak-to-wav.ps1 -SegmentsFile "C:\tmp\segments.json"
#>

param(
    [string] $SegmentsFile = "",
    [switch] $ListVoices
)

Add-Type -AssemblyName System.Speech

$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer

# ── Mode 1: list voices ────────────────────────────────────────────────────────
if ($ListVoices) {
    $installed = $synth.GetInstalledVoices()
    foreach ($v in $installed) {
        Write-Output $v.VoiceInfo.Name
    }
    $synth.Dispose()
    exit 0
}

# ── Mode 2: speak segments ─────────────────────────────────────────────────────
if (-not $SegmentsFile) {
    Write-Error "Provide -ListVoices to list voices, or -SegmentsFile <path> to generate WAVs."
    $synth.Dispose()
    exit 1
}

if (-not (Test-Path $SegmentsFile)) {
    Write-Error "Segments file not found: $SegmentsFile"
    $synth.Dispose()
    exit 1
}

$segments = Get-Content -Path $SegmentsFile -Raw | ConvertFrom-Json

if ($segments.Count -eq 0) {
    Write-Warning "No segments found in $SegmentsFile"
    $synth.Dispose()
    exit 0
}

Write-Host "Speaking $($segments.Count) segments..."

$currentVoice = ""
$i = 0

foreach ($seg in $segments) {
    $i++

    # Switch voice only when it changes (small perf win)
    if ($seg.voice -ne $currentVoice) {
        try {
            $synth.SelectVoice($seg.voice)
            $currentVoice = $seg.voice
        } catch {
            Write-Warning "  Voice '$($seg.voice)' not available – keeping previous voice."
        }
    }

    # Rate: integer -10 … 10
    $synth.Rate = [int]$seg.rate

    # Ensure output directory exists
    $outDir = Split-Path -Parent $seg.outputPath
    if ($outDir -and -not (Test-Path $outDir)) {
        New-Item -ItemType Directory -Path $outDir -Force | Out-Null
    }

    $synth.SetOutputToWaveFile($seg.outputPath)
    $synth.Speak($seg.text)

    if ($i % 20 -eq 0) {
        Write-Host "  ... $i / $($segments.Count) done"
    }
}

# Restore default output (good practice)
$synth.SetOutputToDefaultAudioDevice()
$synth.Dispose()

Write-Host "Done. $($segments.Count) WAV segments written."
