"""Rebuild prototype/index.html from prototype/template.html.

Inlines Leaflet's CSS, the basemap GeoJSON and prototype/data.js into one
self-contained HTML file (that is how the claude.ai artifact was published).

    npm pack leaflet@1.9.4 && tar xzf leaflet-1.9.4.tgz   # gives ./package/dist/leaflet.css
    python scripts/build_prototype.py path/to/package/dist/leaflet.css
"""
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
LEAFLET_JS = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js"


def main(css_path):
    t = (ROOT / "prototype" / "template.html").read_text(encoding="utf-8")
    base = ROOT / "data" / "basemap"
    geo = (
        "const LAND=" + (base / "land.json").read_text() + ";\n"
        "const LAKES=" + (base / "lakes.json").read_text() + ";\n"
        "const RAIL=" + (base / "rail.json").read_text() + ";"
    )
    t = (
        t.replace("/*LEAFLET_CSS*/", pathlib.Path(css_path).read_text(encoding="utf-8"))
        .replace("/*GEO*/", geo)
        .replace("/*DATA*/", (ROOT / "prototype" / "data.js").read_text(encoding="utf-8"))
        .replace("LEAFLET_JS_SRC", LEAFLET_JS)
    )
    (ROOT / "prototype" / "index.html").write_text(t, encoding="utf-8")
    print("wrote prototype/index.html", len(t), "bytes")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
