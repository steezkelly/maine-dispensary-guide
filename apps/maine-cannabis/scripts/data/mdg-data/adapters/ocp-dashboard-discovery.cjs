'use strict';
const fs = require('fs');
const path = require('path');
const store = require('../lib/store.cjs');

/**
 * adapters/ocp-dashboard-discovery.cjs
 *
 * Tickets 009 + 010 transport-discovery adapter.
 *
 * Scans the authoritative OCP page HTML for the embedded dashboard
 * iframe URL and writes a transport-discovery report. The report is
 * the documented evidence for the human-readable ticket acceptance
 * ("transport discovery documented"); the actual production parser
 * remains gated on operator approval because Power BI's
 * programmatic data extraction is not a public API.
 *
 * Returns: { source, page_html_path, page_sha256, iframe_url,
 *            iframe_title, dashboard_family, transport_discovery,
 *            notes }
 */

function discoverIframe(htmlBuf, pageUrl) {
    const html = htmlBuf.toString('utf8');
    const re = /<iframe\b[^>]*\bsrc="([^"]+)"[^>]*\btitle="([^"]+)"[^>]*>/i;
    const m = re.exec(html);
    if (!m) return null;
    const src = m[1];
    const title = m[2];
    const abs = (/^https?:\/\//i.test(src)) ? src : new URL(src, pageUrl).toString();
    return { url: abs, title };
}

function classifyDashboard(iframe) {
    if (!iframe) return null;
    const u = iframe.url.toLowerCase();
    if (u.includes('app.powerbigov.us') || u.includes('powerbi.com')) {
        return {
            family: 'powerbi',
            publisher: 'Microsoft Power BI',
            embed_url: iframe.url,
            programmatic_data_api: false,
            programmatic_export_endpoint: 'unsupported_or_authenticated',
            notes: 'Power BI public embed URLs render the report client-side from a ' +
                'semantic model that is not exposed via a documented public API. ' +
                'Data export through the UI requires interactive click-through. ' +
                'Automated extraction is unsupported and may violate the ' +
                'Power BI terms of use.'
        };
    }
    if (u.includes('arcgis.com') || u.includes('arcgisonline')) {
        return { family: 'arcgis', publisher: 'Esri', embed_url: iframe.url };
    }
    if (u.includes('tableau.com') || u.includes('tableau.')) {
        return { family: 'tableau', publisher: 'Tableau Software', embed_url: iframe.url };
    }
    return { family: 'unknown', publisher: null, embed_url: iframe.url };
}

function findLatestPageHtml(rootDir, sourceId) {
    const arts = store.listRawArtifacts(rootDir, sourceId);
    const pages = arts.filter(p => p.endsWith('/page.html'));
    if (!pages.length) return null;
    pages.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
    return pages[0];
}

async function run(rootDir, src) {
    const pagePath = findLatestPageHtml(rootDir, src.source_id);
    if (!pagePath) {
        const err = new Error('no archived page.html for ' + src.source_id
            + '; run data:mdg:check first');
        err.code = 'NO_PAGE_HTML';
        throw err;
    }
    const html = fs.readFileSync(pagePath);
    const pageSha = store.sha256(html);
    const iframe = discoverIframe(html, src.authoritative_page_url);
    const dashboard = classifyDashboard(iframe);
    const transportDiscovery = {
        page_url: src.authoritative_page_url,
        page_html_path: pagePath,
        page_html_sha256: pageSha,
        iframe_url: iframe ? iframe.url : null,
        iframe_title: iframe ? iframe.title : null,
        dashboard_family: dashboard ? dashboard.family : null,
        dashboard_publisher: dashboard ? dashboard.publisher : null,
        programmatic_data_api: dashboard
            ? (dashboard.programmatic_data_api === true) : null,
        programmatic_export_endpoint: dashboard
            ? dashboard.programmatic_export_endpoint : null,
        notes: dashboard && dashboard.notes ? dashboard.notes : null,
        discovery_method: 'HTML iframe title + src attribute',
        discovered_at_utc: new Date().toISOString()
    };
    return { transport_discovery: transportDiscovery };
}

module.exports = { discoverIframe, classifyDashboard, run, findLatestPageHtml };