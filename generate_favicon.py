#!/usr/bin/env python3
"""
Favicon Generator for Artparty.Social
Generates favicon.ico from the SVG favicon
"""

import os
import sys
from pathlib import Path

def check_dependencies():
    """Check if required dependencies are available"""
    try:
        import cairosvg
        return True
    except ImportError:
        print("❌ cairosvg not found. Installing...")
        try:
            import subprocess
            subprocess.check_call([sys.executable, "-m", "pip", "install", "cairosvg"])
            import cairosvg
            return True
        except Exception as e:
            print(f"❌ Failed to install cairosvg: {e}")
            return False

def generate_favicon():
    """Generate favicon.ico from SVG"""
    try:
        import cairosvg
        
        svg_path = Path("frontend/favicon.svg")
        ico_path = Path("frontend/favicon.ico")
        
        if not svg_path.exists():
            print("❌ favicon.svg not found!")
            return False
            
        print("🔧 Generating favicon.ico from SVG...")
        
        # Convert SVG to PNG first (32x32)
        png_data = cairosvg.svg2png(
            url=str(svg_path),
            output_width=32,
            output_height=32
        )
        
        # Convert PNG to ICO
        # Note: cairosvg doesn't directly support ICO, so we'll create a simple ICO structure
        ico_data = create_simple_ico(png_data)
        
        # Write ICO file
        with open(ico_path, 'wb') as f:
            f.write(ico_data)
            
        print("✅ favicon.ico generated successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error generating favicon: {e}")
        return False

def create_simple_ico(png_data):
    """Create a simple ICO file structure"""
    # This is a simplified ICO file structure
    # In practice, you might want to use a library like Pillow for better ICO support
    
    # ICO header (6 bytes)
    header = b'\x00\x00'  # Reserved
    header += b'\x01\x00'  # Type (1 = ICO)
    header += b'\x01\x00'  # Number of images
    
    # Directory entry (16 bytes)
    entry = b'\x20'  # Width (32)
    entry += b'\x20'  # Height (32)
    entry += b'\x00'  # Color count (0 = no color table)
    entry += b'\x00'  # Reserved
    entry += b'\x01\x00'  # Color planes
    entry += b'\x20\x00'  # Bits per pixel
    entry += len(png_data).to_bytes(4, 'little')  # Size of image data
    entry += b'\x16\x00\x00\x00'  # Offset to image data
    
    # Combine header, entry, and PNG data
    ico_data = header + entry + png_data
    
    return ico_data

def create_placeholder_ico():
    """Create a minimal placeholder ICO file"""
    print("🔧 Creating minimal placeholder ICO file...")
    
    # Minimal ICO file structure
    ico_data = (
        b'\x00\x00'  # Reserved
        b'\x01\x00'  # Type (1 = ICO)
        b'\x01\x00'  # Number of images
        b'\x10'      # Width (16)
        b'\x10'      # Height (16)
        b'\x00'      # Color count
        b'\x00'      # Reserved
        b'\x01\x00'  # Color planes
        b'\x04\x00'  # Bits per pixel
        b'\x40\x00\x00\x00'  # Size (64 bytes)
        b'\x16\x00\x00\x00'  # Offset
        # Simple 16x16 pixel data (64 bytes)
        b'\x00\x00\x00\x00' * 16  # 16 rows of 4 bytes each
    )
    
    with open("frontend/favicon.ico", 'wb') as f:
        f.write(ico_data)
    
    print("✅ Placeholder favicon.ico created!")
    return True

def main():
    """Main function"""
    print("🎨 Artparty.Social Favicon Generator")
    print("=" * 40)
    
    # Check if we're in the right directory
    if not Path("frontend").exists():
        print("❌ Please run this script from the project root directory")
        return False
    
    # Try to generate proper ICO
    if check_dependencies():
        if generate_favicon():
            return True
    
    # Fallback to placeholder
    print("⚠️ Using fallback method...")
    return create_placeholder_ico()

if __name__ == "__main__":
    success = main()
    if success:
        print("\n🎉 Favicon generation completed!")
        print("📁 Files created:")
        print("   - frontend/favicon.svg (SVG favicon)")
        print("   - frontend/favicon.ico (ICO favicon)")
        print("\n💡 To create a better ICO file:")
        print("   1. Visit https://realfavicongenerator.net/")
        print("   2. Upload frontend/favicon.svg")
        print("   3. Download the generated favicon.ico")
    else:
        print("\n❌ Favicon generation failed!")
        sys.exit(1)
