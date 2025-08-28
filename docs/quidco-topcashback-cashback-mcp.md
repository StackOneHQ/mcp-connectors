# Quidco & TopCashback MCP Connectors

## 1. Problem Statement (PR Summary Narrative)
When shopping online (eBay, AliExpress, etc.) I want the best cashback rate. Today I must:
1. Log into Quidco.
2. Search the merchant.
3. Log into TopCashback.
4. Search again.
5. (Potentially) Log into Rakuten.
6. Manually compare, then click the winning affiliate link.

This is repetitive, slow, and error‑prone (easy to miss rate changes or promo spikes). We want MCP connectors so any agent or automation can quickly fetch current rates from multiple sources, pick the best, and open the correct deep link.

## 2. Current Implementation Scope
Two MCP connectors implemented:

| Connector | Tools | Purpose |
|-----------|-------|---------|
| TopCashback | `topcashback_login`, `topcashback_search_merchants`, `topcashback_get_cashback_rate`, `topcashback_get_cashback_rate_best_match` | Auth, merchant autocomplete, rate extraction, best-match + normalization. |
| Quidco | `quidco_login`, `quidco_get_user`, `quidco_search_merchants`, `quidco_get_cashback_offer`, `quidco_get_cashback_offer_best_match` | Auth, user header data, merchant suggestions, offer extraction, best-match + normalization. |

### Normalization
Both connectors parse all percentage tokens (e.g. "Up to 5% cashback" → percentages=[5], min=5, max=5). Ranges (e.g. "2% - 8%") become min=2, max=8, range=true.

### Best-Match Heuristic
Scoring: exact match > prefix > substring > character overlap. Chosen for speed + determinism during prototyping; can be upgraded later (e.g. Levenshtein / token-based similarity).

### Session Handling
Simple cookie capture stored via cache keys: `topcashback:session`, `quidco:session`.

## 3. Architecture Overview
```
apps/server (generic MCP HTTP host)
packages/mcp-connectors
	└─ src/connectors/
			 topcashback.ts
			 quidco.ts
			 ... (other connectors)
```
Each connector exports an `mcpConnectorConfig`. The server process loads configs and exposes tools over JSON-RPC (HTTP + text/event-stream).

## 4. Usage (Local Testing)
### Start Servers (distinct ports)
```bash
bun run build

# Terminal 1
bun run apps/server/src/index.ts --port 3001 --connector topcashback

# Terminal 2
bun run apps/server/src/index.ts --port 3002 --connector quidco
```

### List Tools
```bash
curl -s -X POST http://localhost:3001/mcp \
	-H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
	-d '{"jsonrpc":"2.0","id":"list","method":"tools/list","params":{}}'
```

### Login (Inline Credentials)
```bash
curl -s -X POST http://localhost:3001/mcp \
	-H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
	-d '{"jsonrpc":"2.0","id":"login","method":"tools/call","params":{"name":"topcashback_login","arguments":{"email":"you@example.com","password":"secret"}}}'
```

### Best Match Rate
```bash
curl -s -X POST http://localhost:3001/mcp \
	-H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
	-d '{"jsonrpc":"2.0","id":"best","method":"tools/call","params":{"name":"topcashback_get_cashback_rate_best_match","arguments":{"query":"ebay"}}}'
```

### Quidco Offer (Best Match)
```bash
curl -s -X POST http://localhost:3002/mcp \
	-H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
	-d '{"jsonrpc":"2.0","id":"best","method":"tools/call","params":{"name":"quidco_get_cashback_offer_best_match","arguments":{"query":"ebay"}}}'
```

## 5. Agent / Copilot Workflow
1. Ensure `.mcp.json` lists both servers with correct ports & Accept header.
2. Reload editor so MCP clients re-scan.
3. In chat: "Login to TopCashback then fetch the best cashback rate for Adidas; do the same with Quidco and compare."
4. The agent sequentially invokes the login + best-match tools and summarizes normalized outputs.

## 7. Money-Saving Automation Strategy
| Step | Action | Tool(s) | Notes |
|------|--------|---------|-------|
| 1 | Normalize merchant name | (client-side) | Pre-clean input. |
| 2 | Fetch rates concurrently | `*_get_cashback_rate_best_match` / `*_get_cashback_offer_best_match` | Parallel RPC. |
| 3 | Parse normalized fields | Already returned | Compare maxPercentage values. |
| 4 | Select winning site | Decision function | Add tie-break (historical reliability?). |
| 5 | Construct outbound URL | Future enhancement | Need each site’s affiliate redirect link. |
| 6 | Open in browser | Client | Confirm cookie path for attribution. |

### Practical Cashback Tips
- Always click through from the chosen site last (avoid overwriting referral cookies).
- Disable competing cashback / coupon browser extensions that may hijack the attribution.
- Document expected vs credited rates to detect tracking failures early.
- For "Up to" phrasing treat minPercentage as conservative baseline.

## 8. Limitations / Risks
| Area | Current Approach | Risk | Mitigation Idea |
|------|------------------|------|-----------------|
| HTML Selectors | Single CSS span lookup | Site DOM changes | Add fallback patterns + tests. |
| Heuristic Matching | Simple scoring | Ambiguous matches | Introduce fuzzy distance + threshold. |
| Sessions | In-memory cookies | Expire mid-session | Auto 401 relogin wrapper. |
| Rate Semantics | Raw text | Misinterpreting tiered offers | Structured parsing rules per phrase taxonomy. |
| Scaling | Serial fetch per site | Added latency with more sites | Concurrent & caching layer. |

## 9. Roadmap
### Near-Term
- Shared utility module for matching + percentage normalization.
- Structured JSON output mode (machine-consumable fields separate from human text).
- Add Rakuten connector; meta-tool: `cashback_compare_best` (queries all sites & returns champion with deltas).

### Mid-Term
- Persistence layer (encrypted sessions) + refresh logic.
- Fuzzy matching upgrade (Levenshtein / token Jaccard).
- Rate-change alerting (diff detection + push via webhook or notification tool).

### Long-Term
- Affiliate deep link capture to enable one-click redirection.
- Historical rate datastore for trend / timing recommendations.
- Confidence scoring (DOM pattern stability, parse quality metrics).

## 10. Testing Strategy Summary
- Unit + integration via Vitest + MSW (mock network + DOM HTML fixtures).
- Cases: success, empty list, 401/403 unauthorized, 404/500 failures, missing rate span, normalization correctness, best-match selection.
- Future: snapshot structured JSON for regression detection.

## 11. PR Summary
> Adds Quidco & TopCashback MCP connectors providing authenticated merchant search, cashback rate / offer extraction, best-match merchant resolution, and percentage normalization. Introduces optional inline credential arguments with validation. Distinct local ports (3001/3002) for parallel operation. Lays groundwork for a cross-site comparison meta-tool and future Rakuten integration.

**Benefits:** Automatable multi-site cashback comparison; reduced manual tab-hopping; foundation for rate monitoring & affiliate deep linking.

**Not Included Yet:** Rakuten connector, fuzzy string matching, session auto-refresh, structured JSON vs text split, affiliate link opening.

## 12. Future Meta-Tool Concept
`cashback_compare_best` (planned):
1. Ensure sessions for all configured cashback connectors.
2. Parallel best-match queries.
3. Aggregate normalized results into ranked table.
4. Return champion + reasoning + (future) action link.

## 13. Contribution Ideas for Hack Participants
- Add new site connector (Rakuten / Honey Gold / Capital One Shopping).
- Implement shared `cashback-utils.ts` with normalization + matching.
- Add fuzzy matcher with configurable strategy.
- Implement meta comparator tool.
- Add rate history persistence (SQLite / Tinybird / Supabase).

## 14. Security & Privacy Notes
- Credentials only used transiently for login; not stored beyond runtime cache.
- Consider adding secret manager integration if moving to hosted multi-user environment.
- Avoid logging raw credential values (current code does not log them).

## 15. Open Questions
| Question | Rationale |
|----------|-----------|
| How often do rates change per merchant? | Drives polling frequency & cache TTL. |
| Are differential tiers (new vs existing customers) distinguishable reliably? | Impacts accuracy of decision logic. |
| What affiliate link extraction strategy is acceptable (T&C compliance)? | Legal & attribution integrity. |

## 16. Next Steps Checklist
- [ ] Extract shared helpers
- [ ] Add Rakuten connector
- [ ] Implement comparison meta-tool
- [ ] Add fuzzy matching
- [ ] Auto re-login on 401
- [ ] Structured JSON output mode
- [ ] Affiliate redirect capture
- [ ] Historical rate storage + alerting
