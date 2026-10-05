"""Build data/gazetteer.json: the only place event coordinates come from.

Entries:
  district:<Name>  representative point of the Census 2011 (or 2001) district polygon, precision "district"
  town:<Name>      GeoNames cities1000 point, precision "village" (town/village level)
Manual entries (data/gazetteer_manual.json) must carry their own source.
"""
import csv, json, os
from shapely.geometry import shape
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
g = {}
for fn in ["jk_2007_2019.geojson", "jk_1979_2006.geojson"]:
    for f in json.load(open(os.path.join(ROOT, "data/districts_by_period", fn)))["features"]:
        p = f["properties"]
        key = "district:" + p["district"]
        if key in g:
            continue
        pt = shape(f["geometry"]).representative_point()
        g[key] = {"name": p["district"], "lat": round(pt.y, 4), "lng": round(pt.x, 4), "precision": "district" if not p.get("occupied") else "region",
                  "region": p["region"], "source": "Representative point of Census district polygon (DataMeet)"}
FIX = {"Punch": "Poonch", "Rajaori": "Rajouri", "Riasi": "Reasi", "Gandarbal": "Ganderbal", "Baramula": "Baramulla",
       "Shupiyan": "Shopian", "Bandipura": "Bandipora", "Bhimbar": "Bhimber", "New Mirpur": "Mirpur", "Rawala Kot": "Rawalakot"}
for r in csv.DictReader(open(os.path.join(ROOT, "data/raw/geonames/cities1000_region.csv"))):
    if r["admin1"] not in ("Kashmir", "Azad Kashmir", "Gilgit-Baltistan", "Himachal Pradesh", "Punjab", "Khyber Pakhtunkhwa"):
        continue
    name = FIX.get(r["name"], r["name"])
    key = "town:" + name if r["admin1"] in ("Kashmir", "Azad Kashmir", "Gilgit-Baltistan") else f"town:{name} ({r['admin1']})"
    g[key] = {"name": name, "lat": round(float(r["lat"]), 4), "lng": round(float(r["lon"]), 4), "precision": "village",
                          "admin": r["admin1"] + (" / " + r["admin2"] if r["admin2"] else ""), "source": "GeoNames cities1000 (CC-BY 4.0)"}
man = os.path.join(ROOT, "data/gazetteer_manual.json")
if os.path.exists(man):
    for k, v in json.load(open(man)).items():
        assert v.get("source"), f"manual gazetteer entry {k} needs a source"
        g[k] = v
json.dump(dict(sorted(g.items())), open(os.path.join(ROOT, "data/gazetteer.json"), "w"), indent=1)
print(len(g), "gazetteer entries")

# Place labels for the map: J&K, Ladakh and occupied-area towns only.
MAJOR = {"Srinagar", "Jammu", "Leh", "Kargil", "Anantnag", "Baramulla", "Poonch", "Rajouri", "Kathua", "Udhampur",
         "Doda", "Kishtwar", "Kupwara", "Pulwama", "Muzaffarabad", "Mirpur", "Gilgit", "Skardu"}
feats = []
for k, v in g.items():
    if not k.startswith("town:") or "(" in k:
        continue
    feats.append({"type": "Feature", "properties": {"name": v["name"], "rank": 1 if v["name"] in MAJOR else 2},
                  "geometry": {"type": "Point", "coordinates": [v["lng"], v["lat"]]}})
json.dump({"type": "FeatureCollection", "features": feats}, open(os.path.join(ROOT, "public/geo/place-labels.geojson"), "w"), separators=(",", ":"))
print(len(feats), "place labels")
