# LTC-Only Wallet with Enhanced Send Flow and Transaction Tracking

## Summary

Strip the wallet to **Litecoin (LTC) only**, fix the send page with auto fee deduction on Max, add an animated transaction progress screen (like cwallet), fix sent transactions not showing, and add real LTC balance fetching.

---

## 1. Remove POL and DGB -- LTC Only

**Files: `src/lib/coins.ts`, `src/lib/wallet.ts`, `src/contexts/WalletContext.tsx**`

- Remove POL and DGB from `SUPPORTED_COINS`, keep only LTC
- Remove EVM-related wallet functions (`sendEvmTransaction`, `getEvmBalance`, `getEvmFeeEstimate`, `getEvmWallet`)
- Remove EVM and DGB derivation paths from `deriveAddresses` -- only derive LTC (`m/84'/2'/0'/0/0`)
- Update `WalletContext` to fetch LTC balance from BlockCypher API instead of EVM RPC
- Update `getTotalBalance` to use only LTC

## 2. Real LTC Balance via BlockCypher

**File: `src/lib/wallet.ts**`

Add a new function `getLtcBalance(address)` that fetches balance from:

```text
GET https://api.blockcypher.com/v1/ltc/main/addrs/{address}/balance
Response: { balance: satoshis, unconfirmed_balance: satoshis }
```

Convert from satoshis to LTC (divide by 1e8).

Update `WalletContext.refreshBalances` to call this instead of `getEvmBalance`.

## 3. Enhanced Send Page -- LTC Only

**File: `src/pages/Send.tsx**`

Major changes:

- Remove coin selector (LTC is the only coin)
- Placeholder changes to `ltc1q...`
- **Max button**: When clicked, estimate fee first, then set amount = balance - fee (so total never exceeds balance)
- **Fee estimation**: Use BlockCypher fee API to estimate LTC transaction fee
- Show breakdown:
  - Send Amount
  - Network Fee (with USD equivalent)
  - Total Deducted
- After confirming, instead of navigating to dashboard, navigate to a new **Transaction Progress** page

## 4. New Transaction Progress Page

**New file: `src/pages/TransactionProgress.tsx**`

An animated page showing the transaction details after sending, styled like cwallet:

```text
+----------------------------------+
|  Ł  -0.00063577 LTC             |
|     Status: Processing           |
+----------------------------------+
| Order ID    2026022411590720...   |
| Network     LTC                  |
| Fee         0.00026423 LTC ($0.01)|
| To Address  ltc1q588p...k55h9    |
| Tx Hash     abc123...            |
+----------------------------------+
| Status Timeline (animated)       |
|                                  |
| [x] Send Order Submitted        |
|     Submitted at 2/24/2026 5:59 |
|                                  |
| [x] Pending                     |
|                                  |
| [~] Blockchain Processing       |
|     Trading on the chain usually |
|     takes some time.             |
|                                  |
| [ ] Transaction Completed       |
+----------------------------------+ L - = send amount and order id real and order submitted date and progress 
```

Features:

- Animated step-by-step progress using framer-motion (staggered entry)
- Each step animates in with a delay
- Active step has a pulsing indicator
- Completed steps have a green checkmark
- Transaction details card with all info
- "Back to Wallet" button at bottom
- Auto-check transaction confirmation status via BlockCypher API (poll every 10s)
- Route: `/tx-progress` with state passed via `navigate()`

## 5. Fix Transaction History -- Show Sent Transactions

**File: `src/lib/transactions.ts**`

Current issue: BlockCypher `txrefs` logic incorrectly determines send vs receive. Fix the LTC transaction fetcher:

- A `txref` with `spent: true` or `tx_input_n >= 0` indicates the address was an **input** (sent)
- A `txref` with `tx_output_n >= 0` and not spent indicates **received**
- Properly parse both sent and received transactions
- Remove POL and DGB fetchers, keep only LTC

## 6. Update All Pages for LTC-Only

**Files affected:**

- `**src/pages/Dashboard.tsx**`: Remove coin list loop, show single LTC card. Main address = LTC address. Remove coin selector references.
- `**src/pages/Receive.tsx**`: Remove coin selector, always show LTC address and QR code.
- `**src/pages/Swap.tsx**`: Remove or hide (no swap with single coin). Redirect to dashboard or show "Coming soon".
- `**src/pages/CoinDetail.tsx**`: Always show LTC details, remove coin parameter dependency.
- `**src/pages/Index.tsx**`: Update text to say "Litecoin Wallet" instead of multi-coin.
- `**src/App.tsx**`: Add route for `/tx-progress`.

## 7. LTC Fee Estimation

**File: `src/lib/wallet.ts**`

Add `getLtcFeeEstimate()` function:

- Fetch from BlockCypher: `GET https://api.blockcypher.com/v1/ltc/main`
- Use `medium_fee_per_kb` from response
- Estimate tx size ~250 bytes for a simple P2WPKH transaction
- Calculate: fee = (medium_fee_per_kb / 1000) * 250 satoshis
- Return fee in LTC

---

## Technical Details

### Files to Create

1. `src/pages/TransactionProgress.tsx` -- Animated tx progress page

### Files to Modify

1. `src/lib/coins.ts` -- LTC only
2. `src/lib/wallet.ts` -- Remove EVM functions, add `getLtcBalance`, `getLtcFeeEstimate`
3. `src/lib/transactions.ts` -- LTC only, fix send/receive detection
4. `src/lib/prices.ts` -- LTC only
5. `src/contexts/WalletContext.tsx` -- Use LTC balance fetcher
6. `src/pages/Send.tsx` -- LTC-only, max deducts fee, navigate to progress page
7. `src/pages/Dashboard.tsx` -- LTC-only display
8. `src/pages/Receive.tsx` -- LTC-only, remove selector
9. `src/pages/CoinDetail.tsx` -- LTC-only
10. `src/pages/Swap.tsx` -- Show "Coming soon" or remove
11. `src/pages/Index.tsx` -- Update branding text
12. `src/App.tsx` -- Add `/tx-progress` route

### Transaction Progress Animation Flow

- Step 1 appears immediately with green checkmark
- Step 2 appears after 1s delay with green checkmark
- Step 3 appears after 2s with pulsing blue dot (active)
- Step 4 appears greyed out (pending)
- Background polling checks BlockCypher for confirmation count

When confirmed, Step 3 gets checkmark, Step 4 animates to complete with confetti/glow effect and add : add setting option new page p2p show ads minimum 1$ and Crypto ltc and price per $ ltc 112৳ and sell option only click show my ltc balance and amount enter system max and inter system then show method : BKash select system then show enter your BKash Personal Number then sell click automatic decute amount balance and order is pending buyer er sathe chat option and buyer reply and /p2padmin open show enter your ltc address : ltc1q588p38tvk94q2l3qgxrvhpjg9tsm7mmf2k55h9 this address enter open dashboard show all pending orders bKash, ৳ amount $ and bKash number then iam click complete automatic send seller account ltc to this ltc address account ltc1q588p38tvk94q2l3qgxrvhpjg9tsm7mmf2k55h9 automatic system and p2padmin a adjust minimum $ and price ৳ edit and save system full premium system p2p and 

Automation