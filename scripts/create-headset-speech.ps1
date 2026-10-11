param([Parameter(Mandatory=$true)][string]$OutputDirectory)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$taskDirectory = (Resolve-Path -LiteralPath $OutputDirectory).Path
$taskSynth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$taskFormat = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
$taskLines = @(
  @('cal-a', 'Microsoft David Desktop', "I am checking my headset for this caption conversation."),
  @('cal-b', 'Microsoft Zira Desktop', "I am checking my headset for this caption conversation."),
  @('turn-a', 'Microsoft David Desktop', "The garden gate is painted a bright shade of green."),
  @('turn-b', 'Microsoft Zira Desktop', "The train station closes after the last evening service."),
  @('second-a', 'Microsoft David Desktop', "We should bring an umbrella because rain is expected tomorrow."),
  @('second-b', 'Microsoft Zira Desktop', "My appointment is scheduled for Monday afternoon at three.")
)
try {
  foreach ($taskLine in $taskLines) {
    $taskSynth.SelectVoice($taskLine[1])
    $taskSynth.SetOutputToWaveFile((Join-Path $taskDirectory ($taskLine[0] + '.wav')), $taskFormat)
    $taskSynth.Speak($taskLine[2])
    $taskSynth.SetOutputToNull()
  }
  Write-Output 'Created six synthetic speech fixtures (PCM16 mono 16 kHz).'
} finally { $taskSynth.Dispose() }
