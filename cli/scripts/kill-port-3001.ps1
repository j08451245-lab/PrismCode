# Kill any process listening on port 3001
Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | ForEach-Object {
  taskkill /F /PID $_.OwningProcess 2>$null
}
