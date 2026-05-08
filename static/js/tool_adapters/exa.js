/**
 * Adapter: Exa MCP server tools
 *
 * Covers the active tools exposed by @exa-ai/mcp-server:
 *   • web_search_exa          — semantic web search, returns highlights
 *   • web_fetch_exa           — full-page crawl of one or more URLs
 *   • web_search_advanced_exa — search with full filter/date/domain control
 *   • get_code_context_exa    — code-focused search across docs and repos
 *
 * Deprecated tools are also listed so the strip still shows a sensible
 * label if an older server config calls them.
 *
 * Styles are injected into <head> once on first use — nothing goes in main.css.
 */

import { registerAdapter, injectStyles } from './registry.js';
import { escapeHtml } from '../mcp_tool_ui.js';

// ── Self-contained styles ─────────────────────────────────────────────────────

const EXA_STYLES = `
  .exa-results {
    display: grid;
    gap: 5px;
    max-height: 380px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--border2) transparent;
  }
  .exa-results::-webkit-scrollbar { width: 4px; }
  .exa-results::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 999px; }

  .exa-card {
    display: block;
    padding: 9px 11px;
    background: var(--surface3);
    border: 1px solid var(--border);
    border-radius: 8px;
    text-decoration: none;
    color: inherit;
    transition: border-color .15s, background .15s;
  }
  .exa-card:hover {
    border-color: var(--border2);
    background: var(--surface2);
  }

  .exa-card-head {
    display: flex;
    align-items: center;
    gap: 7px;
  }

  .exa-favicon {
    width: 14px;
    height: 14px;
    border-radius: 2px;
    flex-shrink: 0;
    object-fit: contain;
  }

  .exa-card-title-wrap {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
    flex: 1;
  }

  .exa-card-title {
    font-size: .8rem;
    color: var(--text);
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.3;
  }

  .exa-card-domain {
    font-family: var(--font-mono);
    font-size: .62rem;
    color: var(--text3);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .exa-card-date {
    font-family: var(--font-mono);
    font-size: .61rem;
    color: var(--text3);
    flex-shrink: 0;
    margin-left: auto;
  }

  .exa-card-snippet {
    margin: 5px 0 0 21px;
    font-size: .76rem;
    color: var(--text2);
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .exa-card.exa-card-fetch .exa-card-snippet {
    -webkit-line-clamp: 4;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .exa-no-results {
    font-family: var(--font-mono);
    font-size: .72rem;
    color: var(--text3);
    padding: 6px 2px;
  }
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return url; }
}

function faviconUrl(domain) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`;
}

function fmtDate(raw) {
  if (!raw || raw === 'N/A') return '';
  try {
    return new Date(raw).toLocaleDateString('en', { month: 'short', year: 'numeric' });
  } catch { return ''; }
}

/**
 * Parse Exa's text result into structured objects.
 * Handles both search format (Title:/Highlights:) and fetch format (# title / body text).
 * Blocks are separated by "\n\n---\n\n".
 */
function parseExaResults(text) {
  if (!text || typeof text !== 'string') return [];

  return text.split(/\n\n---\n\n/).map(block => {
    const lines = block.split('\n');
    const r = { title: '', url: '', date: '', highlights: [] };
    let mode = null;

    for (const line of lines) {
      if      (line.startsWith('Title: '))          { r.title = line.slice(7).trim(); mode = null; }
      else if (line.startsWith('# '))               { r.title = line.slice(2).trim(); mode = null; }
      else if (line.startsWith('URL: '))            { r.url   = line.slice(5).trim(); mode = null; }
      else if (line.startsWith('Published: '))      { r.date  = fmtDate(line.slice(11).trim()); mode = null; }
      else if (line.startsWith('Author: '))         { /* skip */ mode = null; }
      else if (line === 'Highlights:')              { mode = 'snippet'; }
      else if (line.startsWith('Text: '))           { r.highlights.push(line.slice(6).trim()); mode = 'snippet'; }
      else if (mode === 'snippet' && line.trim())   { r.highlights.push(line.trim()); }
    }

    return r;
  }).filter(r => r.url);
}

// ── Card renderer ─────────────────────────────────────────────────────────────

function buildCard(r, fetchVariant = false) {
  const domain  = extractDomain(r.url);
  const snippet = fetchVariant
    ? r.highlights.join('\n').trim()
    : r.highlights.slice(0, 3).join(' … ').trim();

  return `
    <a class="exa-card${fetchVariant ? ' exa-card-fetch' : ''}"
       href="${escapeHtml(r.url)}" target="_blank" rel="noopener noreferrer">
      <div class="exa-card-head">
        <img class="exa-favicon"
             src="${escapeHtml(faviconUrl(domain))}"
             alt=""
             loading="lazy"
             onerror="this.style.display='none'" />
        <div class="exa-card-title-wrap">
          <span class="exa-card-title">${escapeHtml(r.title || r.url)}</span>
          <span class="exa-card-domain">${escapeHtml(domain)}</span>
        </div>
        ${r.date ? `<span class="exa-card-date">${escapeHtml(r.date)}</span>` : ''}
      </div>
      ${snippet ? `<p class="exa-card-snippet">${escapeHtml(snippet)}</p>` : ''}
    </a>`;
}

function renderCards(result, fetchVariant = false) {
  injectStyles('exa', EXA_STYLES);
  const results = parseExaResults(result);
  if (!results.length) {
    return `<div class="exa-no-results">${fetchVariant ? 'No content retrieved.' : 'No results found.'}</div>`;
  }
  return `<div class="exa-results">${results.map(r => buildCard(r, fetchVariant)).join('')}</div>`;
}

// ── Adapter registrations ─────────────────────────────────────────────────────

registerAdapter({
  tools: [
    'web_search_exa',
    'web_search_advanced_exa',
    'get_code_context_exa',
    // deprecated — kept so old configs still render correctly
    'deep_search_exa',
    'company_research_exa',
    'people_search_exa',
    'linkedin_search_exa',
  ],

  labelArg: 'query',

  getMetaText(args) {
    return args.query ? String(args.query) : '';
  },

  renderResult(result) {
    return renderCards(result, false);
  },
});

registerAdapter({
  tools: ['web_fetch_exa'],

  getMetaText(args) {
    const list = Array.isArray(args.urls)
      ? args.urls
      : (typeof args.urls === 'string' ? tryParseUrls(args.urls) : []);
    if (!list.length) return '';
    return list.length === 1 ? String(list[0]) : `${list[0]}  +${list.length - 1} more`;
  },

  renderResult(result) {
    return renderCards(result, true);
  },
});

function tryParseUrls(str) {
  try { return JSON.parse(str); } catch { return []; }
}

registerAdapter({
  tools: ['deep_researcher_start'],
  getMetaText(args) { return args.query ? String(args.query) : ''; },
});

registerAdapter({
  tools: ['deep_researcher_check'],
  getMetaText(args) { return args.jobId ? `job ${args.jobId}` : ''; },
});
