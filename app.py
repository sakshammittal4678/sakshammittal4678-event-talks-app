"""
BigQuery Release Notes Viewer — Flask Backend
"""

import re
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

import requests
from flask import Flask, jsonify, render_template
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
ATOM_NS  = "http://www.w3.org/2005/Atom"

# ── Category colours (matched against <h3> tag text) ─────────────────────────
CATEGORY_COLOURS = {
    "feature":        "#4ade80",   # green
    "announcement":   "#60a5fa",   # blue
    "deprecated":     "#f87171",   # red
    "breaking change":"#fb923c",   # orange
    "changed":        "#c084fc",   # purple
    "fixed":          "#34d399",   # emerald
    "issue":          "#facc15",   # yellow
    "libraries":      "#94a3b8",   # slate
    "security":       "#f43f5e",   # rose
}

def colour_for(category: str) -> str:
    key = category.lower()
    for k, v in CATEGORY_COLOURS.items():
        if k in key:
            return v
    return "#94a3b8"  # default slate


def strip_html(html: str) -> str:
    """Remove HTML tags and collapse whitespace."""
    text = re.sub(r"<[^>]+>", " ", html)
    text = re.sub(r"&amp;",  "&", text)
    text = re.sub(r"&lt;",   "<", text)
    text = re.sub(r"&gt;",   ">", text)
    text = re.sub(r"&quot;", '"', text)
    text = re.sub(r"&#39;",  "'", text)
    text = re.sub(r"\s+",    " ", text).strip()
    return text


def parse_sections(html: str) -> list[dict]:
    """
    Split an entry's HTML content into individual category sections
    (each <h3> starts a new section).
    Returns a list of { category, colour, html, plain_text }.
    """
    # Split on every <h3> tag
    parts = re.split(r"(?=<h3)", html, flags=re.IGNORECASE)
    sections = []
    for part in parts:
        part = part.strip()
        if not part:
            continue
        m = re.match(r"<h3[^>]*>(.*?)</h3>(.*)", part, re.IGNORECASE | re.DOTALL)
        if m:
            category  = strip_html(m.group(1)).strip()
            body_html = m.group(2).strip()
        else:
            category  = "Note"
            body_html = part
        plain = strip_html(body_html)
        sections.append({
            "category":   category,
            "colour":     colour_for(category),
            "html":       body_html,
            "plain_text": plain,
        })
    return sections


def parse_feed(xml_text: str) -> list[dict]:
    root = ET.fromstring(xml_text)
    entries = []

    for entry in root.findall(f"{{{ATOM_NS}}}entry"):
        title   = entry.findtext(f"{{{ATOM_NS}}}title",   "").strip()
        updated = entry.findtext(f"{{{ATOM_NS}}}updated",  "").strip()
        link_el = entry.find(f"{{{ATOM_NS}}}link[@rel='alternate']")
        url     = link_el.get("href", "#") if link_el is not None else "#"

        content_el = entry.find(f"{{{ATOM_NS}}}content")
        raw_html   = (content_el.text or "").strip() if content_el is not None else ""

        # Parse ISO date for display
        try:
            dt = datetime.fromisoformat(updated)
            display_date = dt.strftime("%B %-d, %Y")
        except Exception:
            display_date = title  # fallback to title which is already a date string

        sections = parse_sections(raw_html)

        entries.append({
            "title":        title,
            "display_date": display_date,
            "updated":      updated,
            "url":          url,
            "sections":     sections,
        })

    return entries


# ── Routes ────────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/release-notes")
def release_notes():
    try:
        resp = requests.get(FEED_URL, timeout=15, headers={
            "User-Agent": "BQ-ReleaseNotes-Viewer/1.0"
        })
        resp.raise_for_status()
        entries = parse_feed(resp.text)
        return jsonify({"ok": True, "entries": entries})
    except requests.RequestException as e:
        return jsonify({"ok": False, "error": str(e)}), 502
    except ET.ParseError as e:
        return jsonify({"ok": False, "error": f"XML parse error: {e}"}), 500


if __name__ == "__main__":
    app.run(debug=True, port=5050)
