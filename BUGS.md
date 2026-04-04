# Bug Report — Maine Dispensary Guide
**Date:** April 4, 2026 (EDT)
**Tester:** OpenCode (Playwright MCP)
**Severity Scale:** Critical / High / Medium / Low / Cosmetic

---

## 1. CSP Error — Background Texture Blocked

**Severity:** Low (Cosmetic)
**Status:** ✅ FIXED (2026-04-05)
**Pages Affected:** All pages using background texture

### Description
`https://www.transparenttextures.com/patterns/natural-paper.png` is blocked by Content Security Policy.

### CSP Header
```
Content-Security-Policy: img-src 'self' https://images.unsplash.com data:
```

### Expected Fix
Add domain to CSP:
```
Content-Security-Policy: img-src 'self' https://images.unsplash.com https://www.transparenttextures.com data:
```
OR remove the texture reference from the site.

### Console Error
```
[ERROR] Loading the image 'https://www.transparenttextures.com/patterns/natural-paper.png' violates the following Content Security Policy directive: "img-src 'self' https://images.unsplash.com data:". The action has been blocked.
```

---

## 2. Double Title on Contact Page

**Severity:** Low (Cosmetic)
**Status:** ✅ FIXED (2026-04-05)
**Page:** /contact

### Description
Page title shows duplicated "Maine Dispensary Guide":
- **Actual:** "Contact Us | Maine Dispensary Guide | Maine Dispensary Guide"
- **Expected:** "Contact Us | Maine Dispensary Guide"

### Root Cause
In `Layout.astro`, the title suffix `| Maine Dispensary Guide` is being appended to a title that already contains "Maine Dispensary Guide".

### Expected Fix
In `Layout.astro`, check if title already contains "Maine Dispensary Guide" before appending suffix:
```javascript
const displayTitle = title.includes('Maine Dispensary Guide') 
  ? title 
  : `${title} | Maine Dispensary Guide`;
```

---

## 3. www Redirect Failure

**Severity:** Medium
**Status:** ✅ FIXED (2026-04-05) — 301 permanent redirect added in vercel.json
**Pages Affected:** All pages when accessed via www prefix

### Description
- `https://mainedispensaryguide.com` → ✅ Works
- `https://www.mainedispensaryguide.com` → ❌ ERR_ABORTED

### Expected Fix
Add redirect in `astro.config.mjs` or Vercel config:
```javascript
// Option 1: Astro redirect
export default defineConfig({
  redirects: {
    '/www.mainedispensaryguide.com': 'https://mainedispensaryguide.com'
  }
});

// Option 2: Vercel vercel.json
{
  "redirects": [
    { "source": "/(.*)", "destination": "https://mainedispensaryguide.com/$1", "permanent": true }
  ]
}
```

---

## Verified Working (No Issues)

| Feature | Status |
|---------|--------|
| 404 pages | ✅ Proper 404 returned |
| Admin routes | ✅ Blocked (404) |
| XSS in URL | ✅ Escaped |
| Form XSS | ✅ Sanitized |
| SQL injection | ✅ Sanitized |
| Extreme calculator values | ✅ Handled |
| Dark mode toggle | ✅ Works |
| Navigation dropdowns | ✅ Work |
| Lead capture form | ✅ Submits |
| Back/forward nav | ✅ Works |
| Sitemap | ✅ Loads |

---

## Security Notes

This is a static Astro site with no database, which provides natural protection against:
- SQL injection (no DB)
- Server-side XSS (static rendering)
- CSRF (Formspree handles form submissions externally)

The main attack surface is the client-side CSP and any third-party scripts (Formspree).
