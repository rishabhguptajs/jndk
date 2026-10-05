"""Download AWS Open Data terrain tiles (Terrarium encoding) and pack them into a
self-hosted PMTiles archive. Elevation only: no borders, labels or roads.

Source: https://registry.opendata.aws/terrain-tiles/ (s3://elevation-tiles-prod/terrarium)
India-wide coverage at z0 to 6, J&K and Ladakh at z7 to 9.
"""
import math, os, urllib.request, concurrent.futures as cf
from pmtiles.tile import zxy_to_tileid, TileType, Compression
from pmtiles.writer import Writer

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CACHE = os.path.join(ROOT, "data", "raw", "terrain", "cache")
OUT = os.path.join(ROOT, "public", "tiles", "terrain.pmtiles")
os.makedirs(CACHE, exist_ok=True); os.makedirs(os.path.dirname(OUT), exist_ok=True)

def tiles(z, w, s, e, n):
    def xy(lon, lat):
        x = int((lon + 180) / 360 * 2**z)
        y = int((1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * 2**z)
        return x, y
    x0, y0 = xy(w, n); x1, y1 = xy(e, s)
    return [(z, x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)]

want = []
for z in range(0, 7):
    want += tiles(z, 60, 5, 100, 38)
for z in range(7, 10):
    want += tiles(z, 72, 32, 81, 37.3)

def fetch(t):
    z, x, y = t
    p = os.path.join(CACHE, f"{z}_{x}_{y}.png")
    if not os.path.exists(p):
        with urllib.request.urlopen(f"https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png", timeout=60) as r:
            open(p, "wb").write(r.read())
    return t, p

with cf.ThreadPoolExecutor(16) as ex:
    got = list(ex.map(fetch, want))
got.sort(key=lambda tp: zxy_to_tileid(*tp[0]))
with open(OUT, "wb") as f:
    w = Writer(f)
    for (z, x, y), p in got:
        w.write_tile(zxy_to_tileid(z, x, y), open(p, "rb").read())
    w.finalize(
        {"tile_type": TileType.PNG, "tile_compression": Compression.NONE, "min_zoom": 0, "max_zoom": 9,
         "min_lon_e7": int(60e7), "min_lat_e7": int(5e7), "max_lon_e7": int(100e7), "max_lat_e7": int(38e7),
         "center_zoom": 4, "center_lon_e7": int(78e7), "center_lat_e7": int(22e7)},
        {"name": "terrain", "attribution": "Terrain: AWS Open Data Terrain Tiles (Mapzen, SRTM, GMTED, ETOPO1)", "encoding": "terrarium"},
    )
print(len(got), "tiles", os.path.getsize(OUT) // 1024 // 1024, "MB")
