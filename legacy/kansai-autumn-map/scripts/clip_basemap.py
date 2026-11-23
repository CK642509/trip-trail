"""Rebuild data/basemap/*.json for the prototype.

Downloads open data from GitHub, clips it to the Kansai bounding box,
simplifies it and rounds coordinates to 4 decimals (~10 m).

    pip install shapely
    python scripts/clip_basemap.py

Sources:
  land  : https://github.com/dataofjapan/land  (japan.geojson, prefecture polygons)
  lakes : Natural Earth 10m lakes   (public domain)
  rail  : Natural Earth 10m railroads (public domain, very coarse)
"""
import json
import pathlib
import urllib.request

from shapely.geometry import box, mapping, shape

SOURCES = {
    "land": ("https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson", 0.0006),
    "lakes": ("https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_lakes.geojson", 0.0006),
    "rail": ("https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_railroads.geojson", 0.0008),
}
BBOX = box(134.2, 33.8, 137.1, 36.2)  # lon/lat: west, south, east, north
OUT = pathlib.Path(__file__).resolve().parent.parent / "data" / "basemap"


def rnd(o):
    if isinstance(o, float):
        return round(o, 4)
    if isinstance(o, (list, tuple)):
        return [rnd(x) for x in o]
    if isinstance(o, dict):
        return {k: rnd(v) for k, v in o.items()}
    return o


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name, (url, tol) in SOURCES.items():
        print("download", url)
        with urllib.request.urlopen(url) as r:
            src = json.load(r)
        feats = []
        for f in src["features"]:
            g = shape(f["geometry"])
            if not g.intersects(BBOX):
                continue
            g = g.intersection(BBOX).simplify(tol, preserve_topology=True)
            if not g.is_empty:
                feats.append({"type": "Feature", "properties": {}, "geometry": mapping(g)})
        text = json.dumps(rnd({"type": "FeatureCollection", "features": feats}), separators=(",", ":"))
        (OUT / f"{name}.json").write_text(text)
        print(name, len(feats), "features", len(text), "bytes")


if __name__ == "__main__":
    main()
