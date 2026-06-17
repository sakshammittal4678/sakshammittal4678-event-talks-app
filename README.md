# 📊 BigQuery Release Notes Viewer

A clean, dark-themed web application built with **Python Flask** that fetches live [Google BigQuery release notes](https://cloud.google.com/bigquery/docs/release-notes) from the official Atom feed, lets you browse and search them, and makes it easy to **tweet any update directly to X (Twitter)**.

---

## ✨ Features

- 🔄 **Live feed** — fetches directly from Google's official BigQuery Atom XML feed
- 🔁 **One-click refresh** — animated spinner with skeleton card loaders while fetching
- 📂 **Expandable cards** — each release date collapses/expands; latest entry opens by default
- 🏷️ **Category badges** — colour-coded tags: Feature, Announcement, Issue, Deprecated, and more
- 🔍 **Live search** — filters across all update text instantly as you type
- 📌 **Sidebar filters** — click any category pill to narrow down the feed
- 🐦 **Tweet any update** — every section has its own Tweet button that opens a pre-filled compose modal
- ✍️ **Tweet modal** — 280-char counter, editable draft, copy-to-clipboard, and direct Post on X link

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3 · Flask · flask-cors |
| Feed parsing | `xml.etree.ElementTree` (stdlib) |
| HTTP client | `requests` |
| Frontend | Vanilla HTML · CSS · JavaScript (no frameworks) |
| Font | Inter · JetBrains Mono (Google Fonts) |

---

## 📁 Project Structure

```
bq-release-notes/
├── app.py                  # Flask app — feed proxy & XML parser
├── requirements.txt        # Python dependencies
├── .gitignore
├── templates/
│   └── index.html          # Jinja2 page template
└── static/
    ├── style.css           # Dark professional UI
    └── app.js              # Fetch, render, search, tweet logic
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.9+

### 1. Clone the repository

```bash
git clone https://github.com/sakshammittal4678/sakshammittal4678-event-talks-app.git
cd sakshammittal4678-event-talks-app
```

### 2. Install dependencies

```bash
py -m pip install -r requirements.txt
# or
pip install -r requirements.txt
```

### 3. Run the development server

```bash
py -m flask --app app.py run --port 5050
# or
python app.py
```

### 4. Open in browser

```
http://127.0.0.1:5050
```

---

## 📡 API Endpoint

| Method | Route | Description |
|---|---|---|
| `GET` | `/` | Renders the main UI |
| `GET` | `/api/release-notes` | Fetches & parses the BigQuery Atom feed, returns JSON |

### Sample response — `/api/release-notes`

```json
{
  "ok": true,
  "entries": [
    {
      "title": "June 16, 2026",
      "display_date": "June 16, 2026",
      "updated": "2026-06-16T00:00:00-07:00",
      "url": "https://cloud.google.com/bigquery/docs/release-notes#June_16_2026",
      "sections": [
        {
          "category": "Announcement",
          "colour": "#60a5fa",
          "html": "<p>Table Explorer behavior is moving to the <strong>Reference</strong> panel...</p>",
          "plain_text": "Table Explorer behavior is moving to the Reference panel..."
        }
      ]
    }
  ]
}
```

---

## 🐦 Tweet Feature

Each individual release note section has a **Tweet** button. Clicking it opens a compose modal with:

- A pre-filled 280-character tweet draft containing the update text
- The official release notes URL
- `#BigQuery #GoogleCloud` hashtags auto-appended
- A live character counter (warns at 85%, errors above 280)
- **Copy to clipboard** button
- **Post on X** button — opens Twitter's Web Intent in a new tab (no API key needed)

---

## 🖼️ Screenshots

> The app features a dark sidebar with live stats and category filters, expandable date cards, per-section tweet buttons, and a sleek tweet compose modal.

---

## 📄 License

MIT — feel free to fork, modify, and use.

---

## 🙏 Acknowledgements

- [Google Cloud BigQuery Release Notes](https://cloud.google.com/bigquery/docs/release-notes)
- [Twitter Web Intent API](https://developer.twitter.com/en/docs/twitter-for-websites/tweet-button/guides/web-intent)
