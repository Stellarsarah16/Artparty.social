#!/usr/bin/env python3
"""
Simple Favicon Creator for Artparty.Social
Creates a proper binary ICO file without external dependencies
"""

import struct

def create_simple_ico():
    """Create a simple 16x16 ICO file with a colorful pixel art palette"""
    
    # ICO file structure:
    # Header (6 bytes) + Directory Entry (16 bytes) + Image Data
    
    # Header: Reserved(2) + Type(2) + Count(2)
    header = struct.pack('<HHH', 0, 1, 1)  # Reserved=0, Type=1 (ICO), Count=1
    
    # Directory Entry: Width(1) + Height(1) + Colors(1) + Reserved(1) + 
    #                 Planes(2) + BPP(2) + Size(4) + Offset(4)
    width = 16
    height = 16
    colors = 0  # No color table
    reserved = 0
    planes = 1
    bpp = 32  # 32-bit color
    
    # Create a simple 16x16 RGBA image (1024 bytes for 16x16x4)
    image_data = bytearray(1024)
    
    # Create a simple pixel art palette pattern
    colors_16 = [
        0xFF0000FF,  # Red
        0x00FF00FF,  # Green  
        0x0000FFFF,  # Blue
        0xFFFF00FF,  # Yellow
        0xFF00FFFF,  # Magenta
        0x00FFFFFF,  # Cyan
        0xFF8000FF,  # Orange
        0x8000FFFF,  # Purple
        0x008000FF,  # Dark Green
        0x800000FF,  # Dark Red
        0x000080FF,  # Dark Blue
        0x808000FF,  # Olive
        0xFF0080FF,  # Pink
        0x80FF00FF,  # Lime
        0x0080FFFF,  # Light Blue
        0x808080FF   # Gray
    ]
    
    # Fill the image with a simple pattern
    for y in range(16):
        for x in range(16):
            # Create a simple pattern
            color_index = (x + y) % len(colors_16)
            pixel_offset = (y * 16 + x) * 4
            
            # RGBA format (little endian)
            color = colors_16[color_index]
            image_data[pixel_offset] = (color >> 0) & 0xFF   # Blue
            image_data[pixel_offset + 1] = (color >> 8) & 0xFF   # Green
            image_data[pixel_offset + 2] = (color >> 16) & 0xFF  # Red
            image_data[pixel_offset + 3] = (color >> 24) & 0xFF  # Alpha
    
    image_size = len(image_data)
    offset = 22  # Header(6) + Directory Entry(16)
    
    # Directory entry
    entry = struct.pack('<BBBBHHII', 
        width, height, colors, reserved, 
        planes, bpp, image_size, offset)
    
    # Combine all parts
    ico_data = header + entry + image_data
    
    return ico_data

def main():
    """Main function"""
    print("🎨 Creating simple favicon.ico...")
    
    try:
        # Create the ICO data
        ico_data = create_simple_ico()
        
        # Write to file
        with open("frontend/favicon.ico", "wb") as f:
            f.write(ico_data)
        
        print("✅ favicon.ico created successfully!")
        print(f"📁 File size: {len(ico_data)} bytes")
        print("🔧 This should resolve the 404 error")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creating favicon: {e}")
        return False

if __name__ == "__main__":
    success = main()
    if success:
        print("\n🎉 Favicon creation completed!")
        print("💡 Refresh your browser to see the favicon")
    else:
        print("\n❌ Favicon creation failed!")
