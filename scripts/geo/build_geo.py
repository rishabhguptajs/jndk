"""Build the map geometry used by the atlas.

Inputs (all in data/raw/datameet, see PROVENANCE.md there):
  india-soi.geojson                  Survey of India external boundary (DataMeet)
  districts/Census_2001/2001_Dist    14 districts of J&K (valid 1979 to 2006)
  districts/Census_2011/2011_Dist    22 districts of J&K (valid 2007 onward)
  pok-districts-alhasan.geojson      used only to split the occupied area into labels
  shaksgam-ne.geojson                used only to place the Shaksgam label
  india-disputed-lsib.geojson        used only to place the Aksai Chin label

Outputs:
  public/geo/india-soi.geojson                 simplified SoI boundary (what the map renders)
  public/geo/occupied-areas.geojson            label polygons, same fill as India
  public/geo/region-labels.geojson            label points
  public/geo/loc.geojson, public/geo/lac.geojson   optional, approximate lines
  data/districts_by_period/*.geojson + index.json
"""
import json
import os
import shapefile
from shapely.geometry import shape, mapping, Point, MultiPolygon, Polygon
from shapely.ops import unary_union

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RAW = os.path.join(ROOT, "data", "raw", "datameet")
PUB = os.path.join(ROOT, "public", "geo")
DBP = os.path.join(ROOT, "data", "districts_by_period")
os.makedirs(PUB, exist_ok=True)
os.makedirs(DBP, exist_ok=True)


def load(name):
    with open(os.path.join(RAW, name)) as f:
        return json.load(f)


def rnd(geom, nd=4):
    """Round coordinates to keep files small (4 dp is about 11 m)."""
    def r(c):
        if isinstance(c[0], (float, int)):
            return [round(c[0], nd), round(c[1], nd)]
        return [r(x) for x in c]
    m = mapping(geom)
    return {"type": m["type"], "coordinates": r(m["coordinates"])}


def write(path, features):
    with open(path, "w") as f:
        json.dump({"type": "FeatureCollection", "features": features}, f, separators=(",", ":"))
    print("wrote", os.path.relpath(path, ROOT), os.path.getsize(path) // 1024, "KB")


def polys(g):
    if isinstance(g, Polygon):
        return [g]
    if isinstance(g, MultiPolygon):
        return list(g.geoms)
    return [p for p in getattr(g, "geoms", []) if isinstance(p, Polygon)]


# 1. Survey of India boundary ------------------------------------------------
soi = load("india-soi.geojson")
india = unary_union([shape(f["geometry"]) for f in soi["features"]]).buffer(0)
india_s = india.simplify(0.004, preserve_topology=True)
# drop tiny slivers but keep islands
india_s = MultiPolygon([p for p in polys(india_s) if p.area > 1e-5])
write(os.path.join(PUB, "india-soi.geojson"), [{
    "type": "Feature",
    "properties": {"name": "India", "source": "Survey of India boundary via DataMeet (india-soi.geojson)"},
    "geometry": rnd(india_s),
}])

# Mask that dims everything outside India (drawn above the hillshade).
from shapely.geometry import box as _box
mask = _box(30, -20, 130, 60).difference(shape(rnd(india_s)).buffer(0)).buffer(0)
write(os.path.join(PUB, "outside-mask.geojson"), [{"type": "Feature", "properties": {}, "geometry": rnd(mask)}])

# 2. Districts ---------------------------------------------------------------
NAME_FIX = {
    "Baramula": "Baramulla", "Punch": "Poonch", "Rajauri": "Rajouri", "Shupiyan": "Shopian",
    "Badgam": "Budgam", "Bandipore": "Bandipora", "Leh (Ladakh)": "Leh", "Leh (ladakh)": "Leh",
}
VALLEY = {"Anantnag", "Budgam", "Bandipora", "Baramulla", "Ganderbal", "Kulgam", "Kupwara", "Pulwama", "Shopian", "Srinagar"}
JAMMU = {"Doda", "Jammu", "Kathua", "Kishtwar", "Poonch", "Rajouri", "Ramban", "Reasi", "Samba", "Udhampur"}
LADAKH = {"Leh", "Kargil"}


def region_of(d):
    if d in VALLEY:
        return "Kashmir Valley"
    if d in JAMMU:
        return "Jammu"
    if d in LADAKH:
        return "Ladakh"
    raise ValueError(d)


def read_jk(path):
    r = shapefile.Reader(os.path.join(RAW, "districts", path))
    out, na = [], []
    for sr in r.iterShapeRecords():
        d = sr.record.as_dict()
        st = str(d["ST_NM"])
        if not st.startswith("Jammu"):
            continue
        g = shape(sr.shape.__geo_interface__).buffer(0)
        name = NAME_FIX.get(d["DISTRICT"], d["DISTRICT"])
        if name == "Data Not Available":
            na.append(g)
        else:
            out.append((name, g))
    return out, unary_union(na)


d2001, occ2001 = read_jk("Census_2001/2001_Dist")
d2011, occ2011 = read_jk("Census_2011/2011_Dist")

# Occupied area split (labels only). The Census "Data Not Available" polygon is
# the part of J&K under Pakistani occupation (plus Shaksgam, ceded to China).
pk = load("pok-districts-alhasan.geojson")
ajk = unary_union([shape(f["geometry"]) for f in pk["features"] if f["properties"]["PROVINCE"] == "AZAD KASHMIR"]).buffer(0)
shaksgam = unary_union([shape(f["geometry"]) for f in load("shaksgam-ne.geojson")["features"]]).buffer(0)
lsib = load("india-disputed-lsib.geojson")["features"]
aksai = unary_union([shape(f["geometry"]) for f in lsib if f["properties"]["COUNTRY_NA"] == "Aksai Chin (disp)"]).buffer(0)

occ = occ2011.buffer(0)
pojk_ajk = occ.intersection(ajk.buffer(0.02))
shak = occ.intersection(shaksgam.buffer(0.02)).difference(pojk_ajk)
gb = occ.difference(pojk_ajk).difference(shak)
aksai_in = india.intersection(aksai)


def clean(g, tol=0.004):
    g = g.buffer(0).simplify(tol, preserve_topology=True)
    ps = [p for p in polys(g) if p.area > 2e-4]
    return MultiPolygon(ps)


OCC = [
    ("pojk", "Pakistan-occupied Jammu & Kashmir (PoJK)", "PoJK", clean(pojk_ajk), "J&K"),
    ("gilgit-baltistan", "Gilgit-Baltistan (Pakistan-occupied)", "PoJK", clean(gb), "Ladakh"),
    ("shaksgam", "Shaksgam Valley (illegally ceded by Pakistan to China, 1963)", "Ladakh", clean(shak), "Ladakh"),
    ("aksai-chin", "Aksai Chin (China-occupied)", "Ladakh", clean(aksai_in), "Ladakh"),
]
write(os.path.join(PUB, "occupied-areas.geojson"), [
    {"type": "Feature", "properties": {"id": i, "label": l, "region": r, "ut_post_2019": ut}, "geometry": rnd(g)}
    for i, l, r, g, ut in OCC
])

# Label anchor points chosen by hand inside each area, checked below.
LABELS = [
    ("pojk", "Pakistan-occupied Jammu & Kashmir (PoJK)", 73.75, 33.75),
    ("gilgit-baltistan", "Gilgit-Baltistan (Pakistan-occupied)", 74.6, 35.9),
    ("shaksgam", "Shaksgam Valley (illegally ceded by Pakistan to China, 1963)", 76.55, 36.05),
    ("aksai-chin", "Aksai Chin (China-occupied)", 79.3, 35.1),
    ("ladakh", "Ladakh", 77.6, 34.15),
    ("jk", "Jammu & Kashmir", 75.0, 33.55),
]
lab = []
for i, l, x, y in LABELS:
    if not india.contains(Point(x, y)):
        raise SystemExit(f"label {i} is outside the SoI boundary")
    lab.append({"type": "Feature", "properties": {"id": i, "label": l}, "geometry": {"type": "Point", "coordinates": [x, y]}})
write(os.path.join(PUB, "region-labels.geojson"), lab)

# 3. Districts by period -----------------------------------------------------
def district_features(ds, period, ut_mode):
    feats = []
    for name, g in sorted(ds):
        if ut_mode == "state":
            unit = "Jammu and Kashmir (state)"
        else:
            unit = "Ladakh (UT)" if name in LADAKH else "Jammu and Kashmir (UT)"
        feats.append({"type": "Feature", "properties": {
            "district": name, "region": region_of(name), "admin_unit": unit, "period": period,
        }, "geometry": rnd(g.simplify(0.002, preserve_topology=True))})
    for i, l, r, g, ut in OCC[:2]:
        unit = "Jammu and Kashmir (state)" if ut_mode == "state" else ("Ladakh (UT)" if ut == "Ladakh" else "Jammu and Kashmir (UT)")
        feats.append({"type": "Feature", "properties": {
            "district": l, "region": "PoJK", "admin_unit": unit, "period": period, "occupied": True,
        }, "geometry": rnd(g)})
    return feats


PERIODS = [
    {"id": "jk_1979_2006", "from": "1979-01-01", "to": "2006-12-31", "count": 14, "src": d2001, "ut": "state",
     "note": "Census 2001 district boundaries (14 districts). The 1979 start year is when Kupwara, Budgam, Pulwama and Kargil were created; verify against the J&K gazette before treating the start date as exact."},
    {"id": "jk_2007_2019", "from": "2007-01-01", "to": "2019-10-30", "count": 22, "src": d2011, "ut": "state",
     "note": "Census 2011 district boundaries (22 districts). Eight new districts (Kulgam, Shopian, Ganderbal, Bandipora, Samba, Reasi, Kishtwar, Ramban) were notified in 2006 and became functional in 2007."},
    {"id": "jk_ladakh_2019_present", "from": "2019-10-31", "to": None, "count": 22, "src": d2011, "ut": "ut",
     "note": "Same 22 district boundaries, split into the UT of Jammu and Kashmir (20) and the UT of Ladakh (2) from 31 Oct 2019. Gilgit-Baltistan is shown in Ladakh UT as per the Survey of India map of 2 Nov 2019. The five new Ladakh districts announced in Aug 2024 are not drawn because no official boundary data has been published."},
]
index = []
for p in PERIODS:
    fn = p["id"] + ".geojson"
    write(os.path.join(DBP, fn), district_features(p["src"], p["id"], p["ut"]))
    index.append({k: p[k] for k in ("id", "from", "to", "count", "note")} | {"file": fn})
index.insert(0, {"id": "pre_1979", "from": "1947-10-26", "to": "1978-12-31", "count": None, "file": None,
                 "note": "No digitised district boundaries found for 1947 to 1978. The choropleth is disabled for these years; events still carry their district at the time as text."})
with open(os.path.join(DBP, "index.json"), "w") as f:
    json.dump(index, f, indent=2)

# 4. Optional LoC and LAC lines (approximate) -------------------------------
held = unary_union([g for _, g in d2011]).buffer(0)
loc = held.boundary.intersection(occ.buffer(0.01)).simplify(0.003)
lac = held.boundary.intersection(aksai.buffer(0.01)).simplify(0.003)
write(os.path.join(PUB, "loc.geojson"), [{"type": "Feature", "properties": {
    "label": "Line of Control (military line, not a border)",
    "note": "Approximate. Derived from the edge of the Census 2011 district polygons that adjoin the Pakistan-occupied area."},
    "geometry": rnd(loc)}])
write(os.path.join(PUB, "lac.geojson"), [{"type": "Feature", "properties": {
    "label": "Line of Actual Control (military line, not a border)",
    "note": "Approximate, Ladakh sector only. Derived from the edge of the Census 2011 Leh district polygon that adjoins occupied Aksai Chin."},
    "geometry": rnd(lac)}])
