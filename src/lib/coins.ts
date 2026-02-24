export interface CoinConfig {
  id: string;
  symbol: string;
  name: string;
  icon: string;
  coingeckoId: string;
  decimals: number;
  network: "litecoin";
  color: string;
}

export const SUPPORTED_COINS: CoinConfig[] = [
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
];

export const getCoinById = (id: string) => SUPPORTED_COINS.find((c) => c.id === id);
export const getCoinBySymbol = (symbol: string) => SUPPORTED_COINS.find((c) => c.symbol === symbol);
