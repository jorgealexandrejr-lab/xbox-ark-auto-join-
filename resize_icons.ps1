Add-Type -AssemblyName System.Drawing

$sourcePath = "C:\Users\jjuni\.gemini\antigravity\scratch\xbox-remote-play-extension\icon128.png"
# Backup the original generated image first
$backupPath = "C:\Users\jjuni\.gemini\antigravity\scratch\xbox-remote-play-extension\icon_original.png"
if (-not (Test-Path $backupPath)) {
    Copy-Item -Path $sourcePath -Destination $backupPath -Force
}

$sizes = @{
    16  = "C:\Users\jjuni\.gemini\antigravity\scratch\xbox-remote-play-extension\icon16.png"
    48  = "C:\Users\jjuni\.gemini\antigravity\scratch\xbox-remote-play-extension\icon48.png"
    128 = "C:\Users\jjuni\.gemini\antigravity\scratch\xbox-remote-play-extension\icon128.png"
}

$srcImage = [System.Drawing.Image]::FromFile($backupPath)

foreach ($size in $sizes.Keys) {
    $destPath = $sizes[$size]
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $graph = [System.Drawing.Graphics]::FromImage($bmp)
    
    # Set high quality resize settings
    $graph.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graph.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $graph.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graph.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    
    $graph.DrawImage($srcImage, 0, 0, $size, $size)
    
    # Save the image
    $bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    # Clean up
    $graph.Dispose()
    $bmp.Dispose()
}

$srcImage.Dispose()
Write-Output "Icons resized successfully!"
