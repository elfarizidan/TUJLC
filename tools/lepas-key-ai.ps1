# Lepas API key Claude dari laptop ini. Fitur AI Akademi ELCY langsung nonaktif.
# Jalankan: powershell -ExecutionPolicy Bypass -File tools\lepas-key-ai.ps1

[Environment]::SetEnvironmentVariable("ANTHROPIC_API_KEY", $null, "User")
Remove-Item Env:ANTHROPIC_API_KEY -ErrorAction SilentlyContinue
Write-Host "API key sudah dilepas dari laptop ini. Fitur AI nonaktif." -ForegroundColor Green
Write-Host "Supaya key mati total, hapus juga di console.anthropic.com > API Keys."
