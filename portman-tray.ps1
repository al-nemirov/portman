# PORTMAN system tray icon (PowerShell + WinForms NotifyIcon).
# Talks to portman UI via HTTP, polls /api/snapshot every 5s.
#
# Usage:   portman.exe tray  (or)   powershell -File portman-tray.ps1 -Port 9876
#
# Right-click menu: Open UI / Toggle AUTO / Quit.
# Tooltip shows PROC / IDLE / PROT counts and AUTO state.

param([int]$Port = 9876)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$base = "http://127.0.0.1:$Port"

# Use SHELL32.dll icon #25 (computer with arrow). Falls back to default app icon.
$iconPath = "$env:SystemRoot\System32\shell32.dll"
$icon = [System.Drawing.Icon]::ExtractAssociatedIcon($iconPath)
try {
  $shell32 = Add-Type -MemberDefinition '
    [DllImport("shell32.dll", CharSet = CharSet.Auto)]
    public static extern int ExtractIconEx(string sFile, int iIndex, out IntPtr piLargeVersion, out IntPtr piSmallVersion, int amountIcons);
  ' -Name 'IconExtract' -Namespace 'PortmanShell' -PassThru
  $large = [IntPtr]::Zero; $small = [IntPtr]::Zero
  [PortmanShell.IconExtract]::ExtractIconEx($iconPath, 25, [ref]$large, [ref]$small, 1) | Out-Null
  if ($small -ne [IntPtr]::Zero) {
    $icon = [System.Drawing.Icon]::FromHandle($small)
  }
} catch {}

$ni = New-Object System.Windows.Forms.NotifyIcon
$ni.Icon = $icon
$ni.Visible = $true
$ni.Text = "PORTMAN"

$menu = New-Object System.Windows.Forms.ContextMenuStrip

$miOpen = $menu.Items.Add("Open UI")
$miOpen.add_Click({ Start-Process "$base/" })

$miAuto = $menu.Items.Add("Toggle AUTO")
$miAuto.add_Click({
  try {
    $snap = Invoke-RestMethod -Uri "$base/api/snapshot" -TimeoutSec 3
    $next = -not $snap.settings.autoEnabled
    Invoke-RestMethod -Method POST -Uri "$base/api/settings" `
      -ContentType "application/json" `
      -Body (@{ autoEnabled = $next } | ConvertTo-Json) -TimeoutSec 3 | Out-Null
    $state = if ($next) {"ON"} else {"OFF"}
    $ni.ShowBalloonTip(2000, "PORTMAN", "AUTO $state", [System.Windows.Forms.ToolTipIcon]::Info)
  } catch {
    $ni.ShowBalloonTip(2000, "PORTMAN", "Server not reachable on :$Port", [System.Windows.Forms.ToolTipIcon]::Warning)
  }
})

$miSep = $menu.Items.Add("-")
$miQuit = $menu.Items.Add("Quit Tray")
$miQuit.add_Click({
  $ni.Visible = $false
  $ni.Dispose()
  [System.Windows.Forms.Application]::Exit()
})

$ni.ContextMenuStrip = $menu
$ni.add_DoubleClick({ Start-Process "$base/" })

# Update tooltip every 5 seconds
$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 5000
$timer.add_Tick({
  try {
    $snap = Invoke-RestMethod -Uri "$base/api/snapshot" -TimeoutSec 2
    $idle = ($snap.items | Where-Object { -not $_.protected -and $_.conn -eq 0 -and $_.idleSec -gt 60 }).Count
    $prot = ($snap.items | Where-Object { $_.protected }).Count
    $auto = if ($snap.settings.autoEnabled) {"ON"} else {"OFF"}
    $ni.Text = "PORTMAN`nPROC $($snap.items.Count) IDLE $idle PROT $prot`nAUTO $auto"
  } catch {
    $ni.Text = "PORTMAN (offline)"
  }
})
$timer.Start()

[System.Windows.Forms.Application]::Run()
