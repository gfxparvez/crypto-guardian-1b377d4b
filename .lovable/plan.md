

# Full App Update: POL, LTC, DGB Wallet

## Summary
Strip the wallet down to **3 coins only** -- Polygon (POL), Litecoin (LTC), and DigiByte (DGB) -- with real BIP39 addresses, live CoinGecko prices, price charts on coin pages, and a clean white design with smooth animations.

---

## Changes Overview

### 1. Coins: Keep Only POL, LTC, DGB
- Remove BTC, ETH, SOL, DOGE, USDT from `src/lib/coins.ts`
- Add **DigiByte (DGB)** with CoinGecko ID `digibyte`, derivation path `m/44'/20'/0'/0/0`
- Keep **POL** (Polygon, EVM, chain 137) and **LTC** (Litecoin)
- Update the network type to include `"digibyte"`

### 2. Real Wallet Addresses (BIP39)
- Update `src/lib/wallet.ts` to add DigiByte derivation path (`m/44'/20'/0'/0/0`)
- POL uses standard EVM path (`m/44'/60'/0'/0/0`) -- already works
- LTC uses `m/44'/2'/0'/0/0` -- already works
- All addresses derived from BIP39 mnemonic (ethers.js HDNodeWallet)

### 3. Real-Time CoinGecko Prices
- Update `src/lib/prices.ts` to only fetch for `matic-network,litecoin,digibyte`
- Update fallback prices to only include POL, LTC, DGB
- CryptoCompare fallback also updated for the 3 coins

### 4. Price Chart on Coin Detail Page
- Add a 7-day price chart using **Recharts** (already installed) on `src/pages/CoinDetail.tsx`
- Fetch chart data from CoinGecko: `/api/v3/coins/{id}/market_chart?vs_currency=usd&days=7`
- Display as a smooth area/line chart with gradient fill matching the coin color
- Show price on hover with a tooltip

### 5. Update All Pages
Files that reference `SUPPORTED_COINS` or specific coin IDs will be updated:
- **`src/pages/Dashboard.tsx`** -- default address shows POL address, transaction lookup uses POL address
- **`src/pages/Send.tsx`** -- default coin selection set to `pol`
- **`src/pages/Receive.tsx`** -- default coin set to `pol`
- **`src/pages/Swap.tsx`** -- default from/to set to `pol`/`ltc`
- **`src/pages/Index.tsx`** -- update feature description text to say "POL, LTC, DGB"
- **`src/contexts/WalletContext.tsx`** -- balance refresh and Firebase wallet ID uses `pol` instead of `eth`

### 6. White Design with Animations
- Current theme is already white/light -- will refine with:
  - Subtle entrance animations on all cards (already using framer-motion)
  - Add a gentle hover scale effect on coin cards
  - Smooth page transitions
  - Coin icon color accents on cards

---

## Technical Details

### New DigiByte Coin Config
```text
id: "dgb"
symbol: "DGB"
name: "DigiByte"
icon: "D"
coingeckoId: "digibyte"
decimals: 8
network: "digibyte"
color: "#006AD2"
```

### Price Chart API
```text
GET https://api.coingecko.com/api/v3/coins/{coingeckoId}/market_chart?vs_currency=usd&days=7
Response: { prices: [[timestamp, price], ...] }
```
Rendered with Recharts `AreaChart` component.

### Files to Modify
1. `src/lib/coins.ts` -- 3 coins only, add DGB, add "digibyte" network type
2. `src/lib/wallet.ts` -- add DigiByte derivation, remove unused networks
3. `src/lib/prices.ts` -- update fallback prices for 3 coins only
4. `src/contexts/WalletContext.tsx` -- use `pol` as primary address key
5. `src/pages/Index.tsx` -- update feature text
6. `src/pages/Dashboard.tsx` -- default to POL, hover animations
7. `src/pages/CoinDetail.tsx` -- add 7-day price chart with Recharts
8. `src/pages/Send.tsx` -- default coin to `pol`
9. `src/pages/Receive.tsx` -- default coin to `pol`
10. `src/pages/Swap.tsx` -- default coins to `pol`/`ltc`

