# Deep Research Reference

## Web Search Strategy

### Effective Queries

```
"{API name}" site:docs.{provider}.com      # Official docs
"{SDK name}" npm README changelog          # Package info
"{protocol}" specification RFC              # Standards
"{tool}" "breaking changes" version         # Migration issues
"{error message}" site:github.com/issues   # Known bugs
```

### Source Prioritization

1. **Official documentation** — Always start here
2. **SDK/library source code** — The ultimate ground truth
3. **Official GitHub repo** — Issues, PRs, discussions
4. **Package README/changelog** — Breaking changes, migration guides
5. **Community answers** — Stack Overflow, Reddit (verify independently)

## Reference Code Analysis Checklist

When analyzing a reference implementation:

- [ ] What SDK/library version does it use?
- [ ] What's the initialization/setup pattern?
- [ ] How does it handle authentication?
- [ ] What error handling patterns does it use?
- [ ] What retry/backoff strategy is implemented?
- [ ] What edge cases does it handle?
- [ ] How does it handle cleanup/shutdown?
- [ ] What logging/observability does it include?
- [ ] What configuration is required?
- [ ] What are the known limitations (check README/Issues)?

## Diagnostic Script Patterns

### API Probe Script
```javascript
// Quick probe to test API behavior
try {
    const res = await fetch(URL, { method, headers, body });
    console.log('Status:', res.status);
    console.log('Headers:', Object.fromEntries(res.headers));
    const data = await res.json();
    console.log('Body:', JSON.stringify(data, null, 2));
} catch (err) {
    console.log('Error:', err.message);
}
```

### DOM Discovery Script (for CDP/scraping)
```javascript
// Discover actual DOM structure
const selectors = ['[class*="target"]', '[data-attr]', ...];
for (const sel of selectors) {
    const els = document.querySelectorAll(sel);
    if (els.length) console.log(`${sel}: ${els.length} matches`);
}
```

### SDK Feature Discovery
```javascript
// Discover what an SDK exposes
const sdk = await import('sdk-name');
console.log('Exports:', Object.keys(sdk));
console.log('Methods:', Object.getOwnPropertyNames(sdk.prototype || sdk));
```

## Research Document Template

See `templates/research-findings.template.md` for the standard format.

## Common Pitfalls

1. **Outdated docs** — Check last-modified date on documentation pages
2. **Version mismatch** — Reference code may use a different SDK version
3. **Optimistic examples** — Official examples often skip error handling
4. **Rate limit discovery** — Test rate limits early, not when you hit them
5. **Auth token scope** — APIs may need specific scopes/permissions you didn't request
6. **Pagination** — APIs may truncate results without warning
7. **Timezone/encoding** — UTC vs local, UTF-8 vs ASCII silently corrupt data
