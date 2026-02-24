export interface CoinConfig {
  id: string;
  symbol: string;
  name: string;
  icon: string;
  coingeckoId: string;
  decimals: number;
  network: "evm" | "bitcoin" | "solana" | "litecoin" | "dogecoin";
  chainId?: number;
  rpcUrl?: string;
  color: string;
}

export const SUPPORTED_COINS: CoinConfig[] = [
  {
    id: "btc",
    symbol: "BTC",
    name: "Bitcoin",
    icon: "₿",
    coingeckoId: "bitcoin",
    decimals: 8,
    network: "bitcoin",
    color: "#F7931A",
  },
  {
    id: "eth",
    symbol: "ETH",
    name: "Ethereum",
    icon: "Ξ",
    coingeckoId: "ethereum",
    decimals: 18,
    network: "evm",
    chainId: 1,
    rpcUrl: "https://eth.drpc.org",
    color: "#627EEA",
  },
  {
    id: "pol",
    symbol: "POL",
    name: "Polygon",
    icon: "⬡",
    coingeckoId: "matic-network",
    decimals: 18,
    network: "evm",
    chainId: 137,
    rpcUrl: "https://polygon.drpc.org",
    color: "#8247E5",
  },
  {
    id: "sol",
    symbol: "SOL",
    name: "Solana",
    icon: "◎",
    coingeckoId: "solana",
    decimals: 9,
    network: "solana",
    color: "#9945FF",
  },
  {
    id: "ltc",
    symbol: "LTC",
    name: "Litecoin",
    icon: "Ł",
    coingeckoId: "litecoin",
    decimals: 8,
    network: "litecoin",
    color: "#BFBBBB",
  },
  {
    id: "doge",
    symbol: "DOGE",
    name: "Dogecoin",
    icon: "Ð",
    coingeckoId: "dogecoin",
    decimals: 8,
    network: "dogecoin",
    color: "#C2A633",
  },
  {
    id: "usdt",
    symbol: "USDT",
    name: "Tether",
    icon: "₮",
    coingeckoId: "tether",
    decimals: 6,
    network: "evm",
    chainId: 1,
    color: "#26A17B",
  },
];

export const getCoinById = (id: string) => SUPPORTED_COINS.find((c) => c.id === id);
export const getCoinBySymbol = (symbol: string) => SUPPORTED_COINS.find((c) => c.symbol === symbol);
