"""32x32 favicon.ico üretir (koyu zemin + yeşil saha) — /favicon.ico 404'ünü kökten çözer."""
import math
import struct

W = H = 32
px = [[(15, 23, 42) for _ in range(W)] for _ in range(H)]
for y in range(6, 26):
    for x in range(3, 29):
        px[y][x] = (22, 101, 52)
        if x in (3, 28) or y in (6, 25):
            px[y][x] = (240, 248, 255)
for x in range(3, 29):
    px[16][x] = (240, 248, 255)
for y in range(6, 26):
    for x in range(3, 29):
        d = math.hypot(x - 15.5, y - 15.5)
        if 4.2 < d < 5.0:
            px[y][x] = (240, 248, 255)
for y in range(12, 20):
    px[y][3] = (255, 255, 255)
    px[y][28] = (255, 255, 255)

xor = bytearray()
for y in range(H - 1, -1, -1):
    for x in range(W):
        r, g, b = px[y][x]
        xor += bytes((b, g, r, 255))
and_mask = bytes((W // 8) * H)

bmp = bytearray(40)
struct.pack_into('<I', bmp, 0, 40)
struct.pack_into('<i', bmp, 4, W)
struct.pack_into('<i', bmp, 8, H * 2)
struct.pack_into('<H', bmp, 12, 1)
struct.pack_into('<H', bmp, 14, 32)
struct.pack_into('<I', bmp, 20, len(xor) + len(and_mask))
image = bytes(bmp) + bytes(xor) + and_mask

ico = bytearray()
ico += struct.pack('<HHH', 0, 1, 1)
ico += bytes((W, H, 0, 0))
ico += struct.pack('<HH', 1, 32)
ico += struct.pack('<I', len(image))
ico += struct.pack('<I', 22)
ico += image
open('public/favicon.ico', 'wb').write(bytes(ico))
print('favicon.ico yazıldı:', len(ico), 'bayt')
