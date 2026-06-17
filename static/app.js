/* ================================================================
   BigQuery Release Notes — app.js
   Handles: API fetch, rendering, filtering, search, tweet modal
   ================================================================ */

'use strict';

// ── State ─────────────────────────────────────────────────────────
let allEntries   = [];   // full parsed dataset
let activeFilter = null; // active category pill filter
let searchQuery  = '';

// ── DOM refs ──────────────────────────────────────────────────────
const refreshBtn       = document.getElementById('refresh-btn');
const refreshIcon      = document.getElementById('refresh-icon');
const entriesContainer = document.getElementById('entries-container');
const skeletonContainer= document.getElementById('skeleton-container');
const emptyState       = document.getElementById('empty-state');
const errorBanner      = document.getElementById('error-banner');
const errorText        = document.getElementById('error-text');
const lastRefreshed    = document.getElementById('last-refreshed');
const statTotal        = document.getElementById('stat-total');
const statLatest       = document.getElementById('stat-latest');
const filterPills      = document.getElementById('filter-pills');
const searchInput      = document.getElementById('search-input');

// Tweet modal
const tweetOverlay     = document.getElementById('tweet-overlay');
const tweetMetaDate    = document.getElementById('tweet-meta-date');
const tweetTextarea    = document.getElementById('tweet-text');
const charCounter      = document.getElementById('char-counter');
const tweetPostBtn     = document.getElementById('tweet-post-btn');
const tweetCopyBtn     = document.getElementById('tweet-copy-btn');
const modalClose       = document.getElementById('modal-close');

// ── Skeleton loaders ──────────────────────────────────────────────
function showSkeletons(count = 5) {
  skeletonContainer.innerHTML = '';
  for (let i = 0; i < count; i++) {
    skeletonContainer.innerHTML += `
      <div class="skeleton-card">
        <div class="sk-line w-40"></div>
        <div class="sk-line h-tag" style="margin-top:14px"></div>
        <div class="sk-line w-100"></div>
        <div class="sk-line w-85"></div>
        <div class="sk-line w-70" style="margin-top:14px"></div>
        <div class="sk-line w-100"></div>
      </div>`;
  }
  skeletonContainer.style.display = 'flex';
  skeletonContainer.style.flexDirection = 'column';
  skeletonContainer.style.gap = '16px';
}

function hideSkeletons() {
  skeletonContainer.innerHTML = '';
}

// ── Fetch release notes ───────────────────────────────────────────
async function fetchNotes() {
  setRefreshing(true);
  hideError();
  showSkeletons();
  entriesContainer.innerHTML = '';
  emptyState.classList.add('hidden');

  try {
    const res  = await fetch('/api/release-notes');
    const data = await res.json();

    if (!data.ok) throw new Error(data.error || 'Unknown server error');

    allEntries = data.entries;
    updateSidebar();
    renderEntries();

    const now = new Date();
    lastRefreshed.textContent = `Refreshed at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } catch (err) {
    showError(err.message);
  } finally {
    hideSkeletons();
    setRefreshing(false);
  }
}

// ── Sidebar: stats + filter pills ────────────────────────────────
function updateSidebar() {
  statTotal.textContent  = allEntries.length;
  statLatest.textContent = allEntries[0]?.display_date?.split(',')[0] ?? '—';

  // Collect all unique categories + counts
  const catMap = {};
  allEntries.forEach(e =>
    e.sections.forEach(s => {
      const k = s.category.toLowerCase();
      if (!catMap[k]) catMap[k] = { label: s.category, colour: s.colour, count: 0 };
      catMap[k].count++;
    })
  );

  // Sort by count desc
  const cats = Object.values(catMap).sort((a, b) => b.count - a.count);

  filterPills.innerHTML = '';

  // "All" pill
  const allPill = makePill('All', '#94a3b8', allEntries.length, null);
  if (!activeFilter) allPill.classList.add('active');
  filterPills.appendChild(allPill);

  cats.forEach(c => {
    const p = makePill(c.label, c.colour, c.count, c.label);
    if (activeFilter && activeFilter.toLowerCase() === c.label.toLowerCase()) {
      p.classList.add('active');
    }
    filterPills.appendChild(p);
  });
}

function makePill(label, colour, count, filterValue) {
  const p = document.createElement('div');
  p.className = 'pill';
  p.innerHTML = `<span class="pill-dot" style="background:${colour}"></span>${label} <small style="opacity:0.55">${count}</small>`;

  if (filterValue === null) {
    p.style.background = 'rgba(148,163,184,0.10)';
  } else {
    p.style.background = hexToRgba(colour, 0.10);
  }

  p.addEventListener('click', () => {
    activeFilter = (activeFilter === filterValue) ? null : filterValue;
    updateSidebar();
    renderEntries();
  });

  // Active pill colouring
  if ((filterValue === null && !activeFilter) ||
      (activeFilter && activeFilter.toLowerCase() === (filterValue || '').toLowerCase())) {
    p.style.background = hexToRgba(colour, 0.22);
    p.style.borderColor = hexToRgba(colour, 0.50);
    p.style.color = colour;
  }

  return p;
}

function hexToRgba(hex, alpha) {
  // Accepts hex (#rrggbb) or named fallback
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return `rgba(148,163,184,${alpha})`;
  const r = parseInt(m[1].slice(0,2),16);
  const g = parseInt(m[1].slice(2,4),16);
  const b = parseInt(m[1].slice(4,6),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Render entries ────────────────────────────────────────────────
function renderEntries() {
  entriesContainer.innerHTML = '';
  emptyState.classList.add('hidden');

  let entries = allEntries;

  // Apply category filter
  if (activeFilter) {
    entries = entries.map(e => ({
      ...e,
      sections: e.sections.filter(s => s.category.toLowerCase() === activeFilter.toLowerCase())
    })).filter(e => e.sections.length > 0);
  }

  // Apply search
  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    entries = entries.map(e => ({
      ...e,
      sections: e.sections.filter(s =>
        s.plain_text.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
      )
    })).filter(e => e.sections.length > 0 || e.display_date.toLowerCase().includes(q));
  }

  if (entries.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }

  entries.forEach((entry, idx) => {
    const card = buildEntryCard(entry, idx === 0);
    entriesContainer.appendChild(card);
  });
}

function buildEntryCard(entry, expanded) {
  const card = document.createElement('div');
  card.className = 'entry-card' + (expanded ? ' open' : '');

  // Category badges for header preview
  const badges = [...new Set(entry.sections.map(s => s.category))];
  const badgeHtml = badges.slice(0, 4).map(b => {
    const s = entry.sections.find(x => x.category === b);
    return `<span class="section-tag" style="background:${hexToRgba(s.colour,0.15)};color:${s.colour}">${escHtml(b)}</span>`;
  }).join('');

  card.innerHTML = `
    <div class="entry-header">
      <div class="entry-date-wrap">
        <span class="entry-date">${escHtml(entry.display_date)}</span>
        <span class="entry-badge-count">${entry.sections.length} update${entry.sections.length !== 1 ? 's' : ''}</span>
      </div>
      <div class="entry-header-right">
        <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">${badgeHtml}</div>
        <svg class="entry-chevron" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </div>
    <div class="entry-sections">
      ${entry.sections.map(s => buildSectionHtml(s, entry)).join('')}
    </div>
  `;

  card.querySelector('.entry-header').addEventListener('click', () => {
    card.classList.toggle('open');
  });

  // Attach tweet button listeners
  card.querySelectorAll('.btn-tweet-section').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openTweetModal({
        date:      btn.dataset.date,
        category:  btn.dataset.category,
        plainText: btn.dataset.plain,
        url:       btn.dataset.url,
      });
    });
  });

  return card;
}

function buildSectionHtml(section, entry) {
  const plain = section.plain_text;
  const tweetData = JSON.stringify({
    date:      entry.display_date,
    category:  section.category,
    plainText: plain,
    url:       entry.url,
  });

  return `
    <div class="section-item">
      <div class="section-left">
        <span class="section-tag"
          style="background:${hexToRgba(section.colour,0.15)};color:${section.colour}">
          ${escHtml(section.category)}
        </span>
        <div class="section-body">${section.html}</div>
      </div>
      <div class="section-right">
        <button class="btn-tweet-section"
          data-date="${escAttr(entry.display_date)}"
          data-category="${escAttr(section.category)}"
          data-plain="${escAttr(plain)}"
          data-url="${escAttr(entry.url)}">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.912-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
          Tweet
        </button>
      </div>
    </div>`;
}

// ── Tweet modal ───────────────────────────────────────────────────
const MAX_TWEET = 280;

function openTweetModal({ date, category, plainText, url }) {
  tweetMetaDate.textContent = `${date} · ${category}`;

  // Build a sensible tweet draft
  const hashtags = '#BigQuery #GoogleCloud';
  const shortUrl = url || 'https://cloud.google.com/bigquery/docs/release-notes';
  // Reserve space: hashtags (~25) + url (~25) + spaces + ellipsis
  const reserve = hashtags.length + shortUrl.length + 5;
  const bodyLen = MAX_TWEET - reserve;
  let body = plainText.length > bodyLen
    ? plainText.slice(0, bodyLen - 1) + '…'
    : plainText;

  const draft = `${body}\n\n${shortUrl}\n\n${hashtags}`;
  tweetTextarea.value = draft;
  updateCharCount();
  updatePostLink();

  tweetOverlay.classList.remove('hidden');
  tweetTextarea.focus();
  tweetTextarea.setSelectionRange(0, 0);
}

function closeTweetModal() {
  tweetOverlay.classList.add('hidden');
}

function updateCharCount() {
  const len = tweetTextarea.value.length;
  charCounter.textContent = `${len} / ${MAX_TWEET}`;
  charCounter.className = 'char-count' +
    (len > MAX_TWEET ? ' over' : len > MAX_TWEET * 0.85 ? ' warn' : '');
}

function updatePostLink() {
  const encoded = encodeURIComponent(tweetTextarea.value);
  tweetPostBtn.href = `https://twitter.com/intent/tweet?text=${encoded}`;
}

tweetTextarea.addEventListener('input', () => {
  updateCharCount();
  updatePostLink();
});

tweetCopyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(tweetTextarea.value);
    tweetCopyBtn.textContent = 'Copied!';
    setTimeout(() => { tweetCopyBtn.textContent = 'Copy Text'; }, 1800);
  } catch {
    tweetCopyBtn.textContent = 'Copy failed';
  }
});

modalClose.addEventListener('click', closeTweetModal);
tweetOverlay.addEventListener('click', e => {
  if (e.target === tweetOverlay) closeTweetModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeTweetModal();
});

// ── Helpers ───────────────────────────────────────────────────────
function setRefreshing(on) {
  refreshBtn.disabled = on;
  refreshBtn.classList.toggle('spinning', on);
  refreshBtn.querySelector('span').textContent = on ? 'Loading…' : 'Refresh';
}

function showError(msg) {
  errorText.textContent = `⚠ ${msg}`;
  errorBanner.classList.remove('hidden');
}

function hideError() {
  errorBanner.classList.add('hidden');
  errorText.textContent = '';
}

function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escAttr(s) {
  return String(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── Event listeners ───────────────────────────────────────────────
refreshBtn.addEventListener('click', fetchNotes);

searchInput.addEventListener('input', () => {
  searchQuery = searchInput.value;
  renderEntries();
});

// ── Boot ──────────────────────────────────────────────────────────
fetchNotes();
