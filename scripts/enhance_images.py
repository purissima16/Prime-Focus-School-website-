"""
Fast Image Enhancement Script for Prime Focus Schools
"""

import os
import io
from PIL import Image, ImageEnhance, ImageFilter

def enhance_image(src_path, dest_webp, target_size=(1600, 1200)):
    with open(src_path, "rb") as f:
        data = f.read()
    
    with Image.open(io.BytesIO(data)) as im:
        img = im.convert("RGB")
        
        # 1. High-quality Lanczos upscale
        upscaled = img.resize(target_size, Image.Resampling.LANCZOS)
        
        # 2. Unsharp mask
        sharp1 = upscaled.filter(ImageFilter.UnsharpMask(radius=2.0, percent=130, threshold=2))
        
        # 3. Enhance color vibrancy
        vibrant = ImageEnhance.Color(sharp1).enhance(1.18)
        
        # 4. Enhance contrast & brightness
        contrasted = ImageEnhance.Contrast(vibrant).enhance(1.10)
        bright = ImageEnhance.Brightness(contrasted).enhance(1.02)
        
        # 5. Final sharpness
        final_img = ImageEnhance.Sharpness(bright).enhance(1.20)
        
        # Save as WebP (high quality)
        final_img.save(dest_webp, "WEBP", quality=92, method=6)
        
        print(f"[OK] Enhanced: {src_path} -> {dest_webp} ({target_size[0]}x{target_size[1]})")

if __name__ == "__main__":
    if os.path.exists("images/school-1.webp"):
        enhance_image("images/school-1.webp", "images/school-1.webp", (1504, 1152))
    
    if os.path.exists("images/school-2.webp"):
        enhance_image("images/school-2.webp", "images/school-2.webp", (1600, 1225))
        enhance_image("images/school-2.webp", "images/school-hero.webp", (1920, 1470))
    
    print("Done enhancing images.")
