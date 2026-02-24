export interface CoinConfig {
  id: string;
  symbol: string;
  name: string;
  icon: string;
  coingeckoId: string;
  decimals: number;
  network: "evm" | "litecoin" | "digibyte";
  chainId?: number;
  rpcUrl?: string;
  color: string;
}

export const SUPPORTED_COINS: CoinConfig[] = [
  {
    id: "pol",
    symbol: "POL",
    name: "Polygon",
    icon: "⬡",
    coingeckoId: "polygon-ecosystem-token",
    decimals: 18,
    network: "evm",
    chainId: 137,
    rpcUrl: "https://polygon.drpc.org",
    color: "#8247E5",
  },
  {
    id: "ltc",
    symbol: "LTC",
    name: "Litecoin",
    icon: "Ł",
    coingeckoId: "litecoin",
    decimals: 8,
    network: "litecoin",
    color: "#345D9D",
  },
  {
    id: "dgb",
    symbol: "DGB",
    name: "DigiByte",
    icon: "D",
    coingeckoId: "digibyte",
    decimals: 8,
    network: "digibyte",
    color: "#006AD2",
  },
];

export const getCoinById = (id: string) => SUPPORTED_COINS.find((c) => c.id === id);
export const getCoinBySymbol = (symbol: string) => SUPPORTED_COINS.find((c) => c.symbol === symbol);
