"""Clip Natural Earth PHYSICAL layers (land, rivers, lakes, glaciers) to South Asia.

These layers carry no political boundaries. Only geometry is kept; all
name and attribute fields are dropped so no third-party place naming
reaches the map. Source snapshot: data/raw/naturalearth (nvkelso/natural-earth-vector).
"""
import json, os
from shapely.geometry import shape, box, mapping
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RAW = os.path.join(ROOT, "data", "raw", "naturalearth")
PUB = os.path.join(ROOT, "public", "geo")
BBOX = box(55, -2, 105, 45)
JK = box(72, 32, 81, 37.5)

def rnd(c, nd=3):
    if isinstance(c[0], (int, float)):
        return [round(c[0], nd), round(c[1], nd)]
    return [rnd(x, nd) for x in c]

def run(src, dst, keep=lambda p, g: True, tol=0.01):
    gj = json.load(open(os.path.join(RAW, src + ".geojson")))
    out = []
    for f in gj["features"]:
        g = shape(f["geometry"])
        if not g.intersects(BBOX):
            continue
        if not keep(f["properties"], g):
            continue
        g = (g.buffer(0) if g.geom_type.endswith("Polygon") else g).intersection(BBOX).simplify(tol, preserve_topology=True)
        if g.is_empty:
            continue
        m = mapping(g)
        out.append({"type": "Feature", "properties": {"sr": f["properties"].get("scalerank")},
                    "geometry": {"type": m["type"], "coordinates": rnd(m["coordinates"])}})
    json.dump({"type": "FeatureCollection", "features": out}, open(os.path.join(PUB, dst), "w"), separators=(",", ":"))
    print(dst, len(out), os.path.getsize(os.path.join(PUB, dst)) // 1024, "KB")

run("ne_50m_land", "land.geojson", tol=0.02)
run("ne_10m_rivers_lake_centerlines", "rivers.geojson",
    keep=lambda p, g: (p.get("scalerank") or 99) <= 6 or g.intersects(JK), tol=0.005)
run("ne_10m_lakes", "lakes.geojson", keep=lambda p, g: (p.get("scalerank") or 99) <= 6 or g.intersects(JK), tol=0.005)
run("ne_10m_glaciated_areas", "glaciers.geojson", keep=lambda p, g: g.intersects(box(70, 30, 82, 38)), tol=0.005)

# Ocean cover: everything in the wide frame that is not land. Drawn above the
# hillshade so seafloor relief does not show.
from shapely.ops import unary_union
land = unary_union([shape(f["geometry"]).buffer(0) for f in json.load(open(os.path.join(PUB, "land.geojson")))["features"]])
ocean = box(30, -20, 130, 60).difference(land.buffer(0.01)).buffer(0)
m = mapping(ocean)
json.dump({"type": "FeatureCollection", "features": [{"type": "Feature", "properties": {"sr": None}, "geometry": {"type": m["type"], "coordinates": rnd(m["coordinates"])}}]},
          open(os.path.join(PUB, "ocean.geojson"), "w"), separators=(",", ":"))
print("ocean.geojson", os.path.getsize(os.path.join(PUB, "ocean.geojson")) // 1024, "KB")
