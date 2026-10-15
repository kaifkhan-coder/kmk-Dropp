import zlib
import struct
import os

def create_png(width, height, output_path):
    # Generates a PNG with indigo/violet gradient (#4F46E5 to #7C3AED)
    # and a glowing center bolt/beam icon
    raw_data = bytearray()
    cx, cy = width / 2.0, height / 2.0
    radius = min(width, height) * 0.44

    for y in range(height):
        raw_data.append(0) # Filter type 0 (None)
        ny = y / float(height)
        for x in range(width):
            nx = x / float(width)
            # Distance from center
            dx = (x - cx) / cx
            dy = (y - cy) / cy
            dist = (dx*dx + dy*dy) ** 0.5

            # Base gradient: #4338CA (67, 56, 202) to #6D28D9 (109, 40, 217)
            r = int(67 + (109 - 67) * ny)
            g = int(56 + (40 - 56) * ny)
            b = int(202 + (217 - 202) * ny)

            # Center rounded rect / circle emblem
            if dist < 0.85:
                # Add sparkle/beam highlight
                beam_width = 0.15
                if abs(dx - dy * 0.4) < beam_width and abs(dy) < 0.6:
                    # White-cyan lightning / beam
                    r = min(255, r + 160)
                    g = min(255, g + 180)
                    b = 255
                elif abs(dx + dy * 0.3) < 0.1 and abs(dy) < 0.4:
                    r = min(255, r + 130)
                    g = min(255, g + 150)
                    b = 255
                # Outer glow ring
                if 0.75 < dist < 0.85:
                    glow = 1.0 - (dist - 0.75) / 0.10
                    r = min(255, int(r + 80 * glow))
                    g = min(255, int(g + 100 * glow))
                    b = min(255, int(b + 120 * glow))

            raw_data.extend([r, g, b, 255])

    # Compress raw data
    compressed = zlib.compress(bytes(raw_data), level=9)

    # Helper to build PNG chunks
    def make_chunk(chunk_type, chunk_data):
        crc = zlib.crc32(chunk_type + chunk_data) & 0xffffffff
        return struct.pack('>I', len(chunk_data)) + chunk_type + chunk_data + struct.pack('>I', crc)

    png_bytes = bytearray(b'\x89PNG\r\n\x1a\n')
    # IHDR
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    png_bytes.extend(make_chunk(b'IHDR', ihdr_data))
    # IDAT
    png_bytes.extend(make_chunk(b'IDAT', compressed))
    # IEND
    png_bytes.extend(make_chunk(b'IEND', b''))

    with open(output_path, 'wb') as f:
        f.write(png_bytes)
    print(f"Generated {output_path} ({width}x{height})")

os.makedirs('public/icons', exist_ok=True)
create_png(180, 180, 'public/icons/apple-touch-icon.png')
create_png(180, 180, 'public/icons/apple-touch-icon-180.png')
create_png(192, 192, 'public/icons/icon-192.png')
create_png(512, 512, 'public/icons/icon-512.png')
