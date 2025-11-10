Write-Host "Nettoyage complet du projet Next.js en cours..." -ForegroundColor Cyan

# Aller dans le dossier du script (au cas où)
Set-Location $PSScriptRoot

# Supprimer les dossiers de build et cache
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
    Write-Host "Dossier .next supprime"
} else {
    Write-Host "Aucun dossier .next trouve"
}

if (Test-Path "node_modules\.cache") {
    Remove-Item -Recurse -Force "node_modules\.cache"
    Write-Host "Cache de node_modules supprime"
} else {
    Write-Host "Aucun cache node_modules trouve"
}

# Supprimer node_modules et package-lock.json (optionnel mais recommandé)
if (Test-Path "node_modules") {
    Remove-Item -Recurse -Force "node_modules"
    Write-Host "Dossier node_modules supprime"
}

if (Test-Path "package-lock.json") {
    Remove-Item -Force "package-lock.json"
    Write-Host "Fichier package-lock.json supprime"
}

# Réinstaller les dépendances
Write-Host "Reinstallation des dependances npm..."
npm install | Out-Host

# Relancer le serveur de développement
Write-Host "Lancement du serveur Next.js..."
npm run dev