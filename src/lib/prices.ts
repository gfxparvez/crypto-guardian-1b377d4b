import { SUPPORTED_COINS } from "./coins";

export interface PriceData {
  [coinId: string]: {
    usd: number;
    usd_24h_change: number;
  };
}

export const fetchPrices = async (): Promise<PriceData> => {
  const ids = SUPPORTED_COINS.map((c) => c.coingeckoId).join(",");
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
      {
        headers: {
          "Accept": "application/json",
          "Cache-Control": "no-cache"
        }
      }
    );
    if (!res.ok) throw new Error("Price fetch failed");
    const data = await res.json();

    const prices: PriceData = {};
    for (const coin of SUPPORTED_COINS) {
      const d = data[coin.coingeckoId];
      if (d) {
        prices[coin.id] = {
          usd: d.usd ?? 0,
          usd_24h_change: d.usd_24h_change ?? 0,
        };
      }
    }
    return prices;
  } catch (error) {
    console.error("Failed to fetch prices:", error);
    // Return fallback prices
    const fallback: PriceData = {};
    for (const coin of SUPPORTED_COINS) {
      fallback[coin.id] = { usd: 0, usd_24h_change: 0 };
    }
    return fallback;
  }
};
