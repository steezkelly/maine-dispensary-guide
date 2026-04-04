# Playwright MCP Search Integration

Playwright MCP enables browser automation through structured accessibility snapshots. This document explains how to use Playwright MCP for search operations.

## MCP Tools Available

When Playwright MCP is active, these tools are available:

| Tool | Purpose |
|------|---------|
| `browser_navigate` | Navigate to URL |
| `browser_snapshot` | Get accessibility tree |
| `browser_click` | Click element |
| `browser_type` | Type text |
| `browser_fill_form` | Fill multiple fields |
| `browser_take_screenshot` | Capture screenshot |
| `browser_evaluate` | Run JavaScript |
| `browser_console_messages` | Get console logs |
| `browser_network_requests` | Inspect network |
| `browser_close` | Close browser |

## Search Workflow

### Using Playwright MCP for Search

1. **Navigate to search engine:**
   ```
   browser_navigate(url="https://www.bing.com/search?q=your+query")
   ```

2. **Wait for page load:**
   ```
   browser_wait_for(timeout=5000)
   ```

3. **Get accessibility snapshot:**
   ```
   browser_snapshot(depth=3)
   ```

4. **Click search result:**
   ```
   browser_click(ref="e15")
   ```

5. **Extract information:**
   ```
   browser_evaluate(function="() => document.body.innerText")
   ```

## Example: Bing Search

```
1. browser_navigate(url="https://www.bing.com/search?q=cannabis+Maine+dispensary")
2. browser_wait_for(timeout=3000)
3. browser_snapshot(depth=3)
4. browser_click(ref="<result-link-ref>")
5. browser_evaluate(function="() => document.title")
```

## Browser Options

Specify browser via MCP config or tool arguments:

| Browser | Config | Tool Argument |
|---------|--------|---------------|
| Chromium | `"browser": "chromium"` | `--browser chromium` |
| Firefox | `"browser": "firefox"` | `--browser firefox` |
| WebKit | `"browser": "webkit"` | `--browser webkit` |

## Search Engine Compatibility

| Engine | Status | Notes |
|--------|--------|-------|
| Bing | ✅ Works | Recommended for automation |
| DuckDuckGo | ⚠️ Blocked | Bot protection triggers CAPTCHA |
| Google | ⚠️ Blocked | Strong bot detection |
| Startpage | ✅ Works | Privacy-focused, reliable |

## Troubleshooting

### Page doesn't load
- Increase timeout: `browser_wait_for(timeout=10000)`
- Check network: `browser_network_requests()`

### Element not found
- Re-snapshot: `browser_snapshot(depth=4)`
- Use selector: `browser_click(selector="#main a")`

### Bot detection
- Try Firefox (less detected)
- Use Startpage instead of Bing
- Add delays between actions

## MCP Configuration

In `~/.config/opencode/opencode.json`:

```json
{
  "mcp": {
    "playwright": {
      "type": "local",
      "command": ["npx", "@playwright/mcp@latest"],
      "enabled": true
    }
  }
}
```

## Alternatives

If MCP tools aren't responding:
- Use `scripts/playwright-search.cjs` as CLI fallback
- Brave Search API (primary search)
- Wikipedia API (research/citations)
