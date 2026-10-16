"""Read-only static checks for this review bundle. No network or production writes."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import re
import json

ROOT = Path(__file__).resolve().parents[1]
errors = []
class Page(HTMLParser):
    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.path, self.ids, self.links, self.images = path, [], [], []
        self.h1 = 0
        self.noindex = False
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            self.ids.append(attrs["id"])
        if tag == "h1":
            self.h1 += 1
        if tag == "meta" and attrs.get("name") == "robots" and "noindex" in attrs.get("content", ""):
            self.noindex = True
        if tag == "img":
            self.images.append(attrs)
            if "alt" not in attrs:
                errors.append(f"{self.path.name}: image without alt")
        for key in ("href", "src"):
            if key in attrs:
                self.links.append(attrs[key])

pages = {}
for path in ROOT.rglob("*.html"):
    page = Page(path)
    page.feed(path.read_text())
    pages[path.resolve()] = page
    if len(page.ids) != len(set(page.ids)):
        errors.append(f"{path.name}: duplicate IDs")
    if page.h1 != 1:
        errors.append(f"{path.name}: expected one H1, got {page.h1}")
    if not page.noindex:
        errors.append(f"{path.name}: missing noindex during review")
    if "—" in path.read_text():
        errors.append(f"{path.name}: em dash in copy")
for path, page in pages.items():
    for url in page.links:
        parts = urlsplit(url)
        if parts.scheme or parts.netloc:
            continue
        target = (path.parent / unquote(parts.path)).resolve() if parts.path else path
        if not target.exists():
            errors.append(f"{path.name}: missing {url}")
        if parts.fragment and target in pages and parts.fragment not in pages[target].ids:
            errors.append(f"{path.name}: missing anchor {url}")
css = (ROOT / "assets/css/style.css").read_text()
for url in re.findall(r"url\(['\"]?([^)'\"]+)", css):
    if not url.startswith(("data:", "http")) and not (ROOT / "assets/css" / url).exists():
        errors.append(f"CSS missing asset: {url}")
for file in [ROOT / "index.html", ROOT / "assets/js/main.js"]:
    source = file.read_text().lower()
    for term in ["além disso", "portanto", "dessa forma", "no entanto", "vale ressaltar", "em resumo", "incrível", "transformador", "sinérgico", "alavancar", "jornada", "crucial", "fundamental"]:
        if term in source:
            errors.append(f"{file.name}: copy term to review: {term}")
assets = list((ROOT / "assets").rglob("*"))
print(json.dumps({"html_pages":len(pages),"images":sum(len(p.images) for p in pages.values()),"asset_files":sum(p.is_file() for p in assets),"asset_bytes":sum(p.stat().st_size for p in assets if p.is_file()),"errors":errors},ensure_ascii=False,indent=2))
raise SystemExit(bool(errors))
