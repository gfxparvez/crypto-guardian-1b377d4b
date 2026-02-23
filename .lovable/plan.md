

# Stellar Vault Guard — Crypto Wallet App

## Design & Theme
- Dark futuristic background with cyan/teal (`#06b6d4`) primary and purple accent
- Glassmorphism cards with `backdrop-blur` and semi-transparent backgrounds
- Floating animated crypto symbols (₿, Ł, ₮) in the background
- Gradient orbs and glow effects throughout
- Custom float and pulse-glow animations

## Pages & Features

### 1. Landing Page
- Hero section with animated floating crypto icons
- Gradient background with glowing orbs
- Three feature cards: Military-Grade Security, Multi-Coin Support, Real-Time Tracking
- Two CTA buttons: "Create New Wallet" and "Import Existing Wallet"

### 2. Wallet Creation & Import
- **Create**: Generate 12-word BIP39 mnemonic seed phrase, derive addresses for BTC, ETH, POL, SOL, LTC, DOGE, USDT
- **Import**: Enter existing mnemonic to restore wallet
- Client-side key generation using ethers.js and crypto libraries
- Wallet data stored in localStorage

### 3. Dashboard
- Total portfolio balance in USD
- List of 7 coins with live prices from CoinGecko API
- 24h price change indicators (green/red)
- Quick action buttons: Send, Receive, Swap
- Refresh button for prices/balances
- Logout and Settings access
- Click any coin for detail view

### 4. Send Page
- Coin selector dropdown
- Recipient address input with validation
- Amount input with live USD conversion
- Confirmation dialog before sending
- Transaction construction using ethers.js (ETH/BNB chains)

### 5. Receive Page
- Display wallet addresses for each supported coin
- QR code generation for each address
- Copy-to-clipboard functionality

### 6. Swap Page
- From/To coin selectors
- Amount input with live conversion rates
- Flip button to swap direction
- Source coin balance display

### 7. Coin Detail Page
- Individual coin price, 24h change, and balance
- Coin-specific send/receive actions

### 8. Two-Factor Authentication (2FA)
- TOTP-based 2FA setup with QR code
- 6-digit OTP verification
- 2FA required before sensitive operations

### 9. Settings Page
- Wallet management (view seed phrase, delete wallet)
- 2FA enable/disable configuration

### 10. Admin Panel (`/gfx` route)
- Separate 2FA gate for admin access
- Portfolio overview with show/hide balances toggle
- Price tracking dashboard
- QR code display for admin 2FA setup

### 11. Firebase Integration
- Firebase Analytics for usage tracking
- Firebase Realtime Database for syncing wallet metadata (not private keys)

### Technical Approach
- ethers.js for ETH/BNB address derivation and transaction signing
- CoinGecko free API for live price data
- QR code generation library for addresses
- All crypto operations client-side
- localStorage for wallet persistence

