# Pasang API key Claude untuk Akademi ELCY.
# Key diketik tersembunyi (tampil sebagai *), disimpan di pengaturan Windows akun kamu
# (environment variable ANTHROPIC_API_KEY), dan tidak ditulis ke file mana pun.
# Jalankan: powershell -ExecutionPolicy Bypass -File tools\pasang-key-ai.ps1

Write-Host ""
Write-Host "=== Pasang API key Claude (Akademi ELCY) ===" -ForegroundColor Yellow
Write-Host "Tempel key dari console.anthropic.com lalu tekan Enter."
Write-Host "Tulisannya sengaja tidak terlihat. Klik kanan untuk menempel."
$secure = Read-Host "API key" -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
    $key = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr).Trim()
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
}

if (-not $key.StartsWith("sk-ant-")) {
    Write-Host "Ini sepertinya bukan API key Claude (harus diawali sk-ant-). Tidak ada yang disimpan." -ForegroundColor Red
    exit 1
}

[Environment]::SetEnvironmentVariable("ANTHROPIC_API_KEY", $key, "User")
$key = $null
Write-Host "Berhasil disimpan. Muat ulang halaman Akademi untuk mulai memakai AI." -ForegroundColor Green
Write-Host "Untuk melepas: powershell -ExecutionPolicy Bypass -File tools\lepas-key-ai.ps1"
