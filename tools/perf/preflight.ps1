# Perf preflight, system side (docs/perf/PREFLIGHT.md): is this machine fit for a performance measurement RIGHT NOW?
# Run:  powershell -ExecutionPolicy Bypass -File tools/perf/preflight.ps1
# Prints one line per check (OK / WARN / FAIL) and a verdict. The page side is debug/preflight.js.
# Born 2026-11-13: the same boot went 19.7 s -> 29.9 s to the cover within ten minutes on a worn machine.

$ErrorActionPreference = "SilentlyContinue"
$checks = @()
function Add-Check($name, $state, $text) { $script:checks += [pscustomobject]@{ check = $name; state = $state; value = $text } }

# --- power: on mains, a performance plan ---
$bat = Get-CimInstance Win32_Battery
if ($bat) {
  $ac = $bat.BatteryStatus -eq 2 -or $bat.BatteryStatus -eq 6 -or $bat.BatteryStatus -eq 7 -or $bat.BatteryStatus -eq 8 -or $bat.BatteryStatus -eq 9
  if ($ac) { Add-Check "power" "OK" "on mains (battery $($bat.EstimatedChargeRemaining) %)" } else { Add-Check "power" "FAIL" "ON BATTERY: plug the laptop in" }
} else { Add-Check "power" "OK" "desktop (no battery)" }
$scheme = (powercfg /getactivescheme) -replace '.*\((.*)\).*', '$1'
if ($scheme -match "High|Ultimate|Best|performance") { Add-Check "power plan" "OK" $scheme } else { Add-Check "power plan" "WARN" "$scheme (use High performance / Best performance)" }

# --- CPU: not throttled, not busy (3 one-second samples) ---
$perf = (Get-Counter '\Processor Information(_Total)\% Processor Performance' -SampleInterval 1 -MaxSamples 3).CounterSamples | Measure-Object CookedValue -Average
$busy = (Get-Counter '\Processor(_Total)\% Processor Time' -SampleInterval 1 -MaxSamples 3).CounterSamples | Measure-Object CookedValue -Average
$p = [math]::Round($perf.Average); $b = [math]::Round($busy.Average)
if ($p -lt 90) { Add-Check "CPU speed" "FAIL" "$p % of base clock (throttled: heat or power saving)" } elseif ($p -lt 110) { Add-Check "CPU speed" "WARN" "$p % of base clock (no turbo)" } else { Add-Check "CPU speed" "OK" "$p % of base clock" }
if ($b -gt 25) { Add-Check "CPU load at rest" "FAIL" "$b % busy before we start" } elseif ($b -gt 10) { Add-Check "CPU load at rest" "WARN" "$b % busy" } else { Add-Check "CPU load at rest" "OK" "$b %" }
$top = Get-Process | Sort-Object CPU -Descending | Select-Object -First 5 Name, @{n = "cpuS"; e = { [math]::Round($_.CPU) } }

# --- memory ---
$os = Get-CimInstance Win32_OperatingSystem
$freeGB = [math]::Round($os.FreePhysicalMemory / 1MB, 1); $totGB = [math]::Round($os.TotalVisibleMemorySize / 1MB, 1)
if ($freeGB -lt 3) { Add-Check "free memory" "FAIL" "$freeGB of $totGB GB free (restart Chrome)" } elseif ($freeGB -lt 6) { Add-Check "free memory" "WARN" "$freeGB of $totGB GB free" } else { Add-Check "free memory" "OK" "$freeGB of $totGB GB free" }
$chrome = Get-Process chrome
$chromeGB = [math]::Round(($chrome | Measure-Object WorkingSet64 -Sum).Sum / 1GB, 1)
if ($chromeGB -gt 6) { Add-Check "Chrome memory" "FAIL" "$chromeGB GB in $($chrome.Count) processes (restart Chrome)" } elseif ($chromeGB -gt 3) { Add-Check "Chrome memory" "WARN" "$chromeGB GB in $($chrome.Count) processes" } else { Add-Check "Chrome memory" "OK" "$chromeGB GB in $($chrome.Count) processes" }

# --- GPU (NVIDIA): temperature, clocks, why it is held back, idle load ---
$smi = Get-Command nvidia-smi
if ($smi) {
  $q = (nvidia-smi --query-gpu=name,temperature.gpu,clocks.sm,clocks.max.sm,utilization.gpu,power.draw,clocks_throttle_reasons.active --format=csv,noheader,nounits) -split ",\s*"
  $temp = [int]$q[1]; $util = [int]$q[4]; $mask = [Convert]::ToInt64(($q[6] -replace "0x", ""), 16)
  $why = @(); if ($mask -band 0x4) { $why += "power cap" }; if ($mask -band 0x20) { $why += "SW thermal" }; if ($mask -band 0x40) { $why += "HW thermal" }; if ($mask -band 0x80) { $why += "HW power brake" }; if ($mask -band 0x8) { $why += "HW slowdown" }
  if ($temp -gt 80) { Add-Check "GPU temperature" "FAIL" "$temp C (let it cool)" } elseif ($temp -gt 70) { Add-Check "GPU temperature" "WARN" "$temp C" } else { Add-Check "GPU temperature" "OK" "$temp C" }
  if ($why.Count) { Add-Check "GPU held back" "FAIL" ($why -join ", ") } else { Add-Check "GPU held back" "OK" "no thermal / power limit active ($($q[0]))" }
  if ($util -gt 20) { Add-Check "GPU load at rest" "FAIL" "$util % busy before we start (another app or tab renders)" } elseif ($util -gt 8) { Add-Check "GPU load at rest" "WARN" "$util %" } else { Add-Check "GPU load at rest" "OK" "$util %" }
} else { Add-Check "GPU" "WARN" "no nvidia-smi: GPU clocks / heat not checked" }
# who uses the GPU's 3D engine (Windows counters, per process)
$eng = (Get-Counter '\GPU Engine(*engtype_3D)\Utilization Percentage').CounterSamples | Where-Object { $_.CookedValue -gt 1 }
$gpuUsers = $eng | ForEach-Object { if ($_.InstanceName -match "pid_(\d+)") { $id = [int]$matches[1]; $pr = Get-Process -Id $id; [pscustomobject]@{ name = $pr.Name; pid = $id; pct = [math]::Round($_.CookedValue) } } } | Sort-Object pct -Descending | Select-Object -First 5

# --- other work on the machine: dev servers (agents' cities), Chrome windows ---
$servers = Get-NetTCPConnection -State Listen | Where-Object { $_.LocalPort -ge 8800 -and $_.LocalPort -le 8899 } | Select-Object -ExpandProperty LocalPort -Unique | Sort-Object
if ($servers.Count -gt 1) { Add-Check "other city servers" "WARN" "listening: $($servers -join ', ') (agents may be rendering: stop them)" } else { Add-Check "other city servers" "OK" "$($servers -join ', ')" }

# --- verdict ---
$fail = ($checks | Where-Object state -eq "FAIL").Count; $warn = ($checks | Where-Object state -eq "WARN").Count
$checks | Format-Table -AutoSize | Out-String -Width 160 | Write-Output
if ($gpuUsers) { "GPU 3D users now:"; $gpuUsers | Format-Table -AutoSize | Out-String | Write-Output }
"Busiest processes (CPU seconds since start):"; $top | Format-Table -AutoSize | Out-String | Write-Output
if ($fail) { "VERDICT: RED ($fail fail, $warn warn): fix the FAIL lines before measuring." } elseif ($warn) { "VERDICT: YELLOW ($warn warn): measure, but expect noise; then run the page check (debug/preflight.js)." } else { "VERDICT: GREEN: now run the page check (debug/preflight.js)." }
