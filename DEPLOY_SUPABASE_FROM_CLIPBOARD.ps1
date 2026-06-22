$ProjectRef = "xebhujvszurydytlrhra"
$Token = (Get-Clipboard -Raw).Trim()

if (-not $Token) {
  Write-Error "Clipboard vazio. Copie o Supabase access token antes de rodar este script."
  exit 1
}

$env:SUPABASE_ACCESS_TOKEN = $Token
npx supabase functions deploy verify-google-play-purchase --project-ref $ProjectRef
