
Objective
- Fix the LTC wallet so real balance reliably shows, with real transactions loading, and no “stuck at zero/loading” behavior.
- Keep LTC-only behavior and preserve your existing send/progress flow.
- Address the root network issue causing current failures.

What I found (root cause)
- The app currently fetches LTC balance and transactions directly from BlockCypher in the browser:
  - src/lib/wallet.ts: getLtcBalance(), getLtcFeeEstimate(), sendLtcTransaction(), tx status polling usage
  - src/lib/transactions.ts: fetchLtcTransactions(), fetchLtcTransactionsFallback()
- Console + network logs show repeated browser-side failures to BlockCypher endpoints (“TypeError: Failed to fetch”), while CoinGecko succeeds.
- This means the balance isn’t missing due to UI formatting; it is missing because upstream on-chain requests are failing before data arrives.

Implementation approach
- Introduce a resilient LTC data layer for read operations (balance + tx history), with provider fallback and robust error handling.
- Prevent “silent zero overwrite” when APIs fail, so real previous values remain visible.
- Surface sync status in UI so users see “network unavailable” instead of misleading 0.
- Keep real send pipeline, but decouple dashboard reads from single-provider dependency.

Planned file-level changes

1) Build a resilient LTC read provider layer
Files:
- src/lib/wallet.ts
- src/lib/transactions.ts
- (new helper file) src/lib/ltcApi.ts

Changes:
- Add shared `fetchWithTimeout` + normalized parser helpers.
- Implement multiple read providers in order (for balance/tx read):
  1) Primary provider (existing BlockCypher)
  2) Fallback provider A (CORS-friendly public LTC explorer API)
  3) Fallback provider B (secondary endpoint)
- For balance:
  - Normalize to LTC string with 8 decimals.
  - Include confirmed + unconfirmed where available.
- For transactions:
  - Normalize to existing `OnChainTransaction` shape.
  - Keep send/receive classification and timestamp sorting.
- Return structured result with source + error info (instead of only “0” on failure).

Why:
- A single failed provider currently causes balance not to show.
- Fallback providers remove single-point-of-failure behavior.

2) Stop replacing good data with fallback zero on transient failures
File:
- src/contexts/WalletContext.tsx

Changes:
- Add sync metadata state:
  - `lastUpdated`
  - `syncError` (human-readable)
  - optional `dataSource` (which provider succeeded)
- In `refreshAll()`:
  - Fetch price/balance/tx in parallel as today, but handle partial success per resource.
  - If balance fetch fails, keep previous balance value (do not force-reset to `"0"`).
  - If tx fetch fails, keep previous transaction list.
  - Continue updating successful resources (e.g., price still updates).
- Add optional immediate retry strategy (single quick retry before marking failed).

Why:
- Current code can leave UI appearing empty/zero even when this is network failure, not true wallet state.

3) Improve dashboard state messaging for trust-wallet-like reliability
File:
- src/pages/Dashboard.tsx

Changes:
- Keep existing loading animation, but add explicit network status:
  - “Syncing…”
  - “Couldn’t reach blockchain API. Showing last known balance.”
- Show `lastUpdated` timestamp when data exists.
- Keep manual refresh button but add disabled/spinner state while refresh in progress.
- Prevent confusing “$0.00 with no context” when sync failed and previous data unavailable.

Why:
- User should see clear sync state rather than ambiguous zero/empty UI.

4) Align CoinDetail to shared context data and same resilience
File:
- src/pages/CoinDetail.tsx

Changes:
- Reuse context transactions when possible (instead of separate direct call that can fail independently).
- If detail page needs its own fetch, route it through same provider fallback utility.
- Same error/status treatment as dashboard.

Why:
- Prevent one page showing data while another shows empty due to duplicate independent fetch logic.

5) Keep real send flow, but avoid read-path coupling to failing provider
Files:
- src/lib/wallet.ts
- src/pages/TransactionProgress.tsx

Changes:
- Keep current real send logic for now (already implemented), but:
  - Add status polling fallback for tx confirmation (not only one endpoint).
  - If confirmation API unavailable, show “broadcasted / awaiting confirmation” gracefully instead of stuck progression.
- Ensure send completion state can resolve based on first available provider response.

Why:
- Previous “blockchain processing not complete” behavior comes from same provider fragility.

6) Required config correction
File:
- vite.config.ts

Change:
- Update server port configuration to:
  - `server.port = 8080`

Why:
- This is required by project constraints.

Sequencing and dependencies
1. Add `ltcApi` helper + normalized fetch/parsing primitives.
2. Refactor `wallet.ts` balance/fee read logic to use helper fallbacks.
3. Refactor `transactions.ts` read logic to use helper fallbacks.
4. Update `WalletContext` for partial-success sync and stale-data retention.
5. Update Dashboard and CoinDetail status rendering.
6. Update TransactionProgress polling fallback behavior.
7. Set Vite server port to 8080.
8. Validate end-to-end flow.

Edge cases to handle
- Fresh wallet with true zero balance (must not be treated as failure).
- Unconfirmed balance handling differences across providers.
- Rate limits / temporary provider outages.
- Network timeout vs malformed response.
- Invalid/missing address in stored wallet.
- App first load without previous cache.

Validation checklist (what I will verify after implementation)
- Import wallet -> dashboard shows real LTC balance (or clear error + last known state).
- Refresh button updates balance/tx when provider available.
- If primary provider fails, fallback provider still displays real balance/transactions.
- CoinDetail and Dashboard show consistent values.
- Send flow still works; transaction progress does not stay permanently stuck when one status endpoint fails.
- No regression in price loading.
- Vite config uses port 8080.

Expected outcome
- Real LTC balance displays reliably.
- Transactions and status are resilient to API outages.
- UI behaves clearly and professionally (Trust Wallet-like sync behavior) instead of silent zeros.
