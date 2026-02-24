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
      { headers: { "Accept": "application/json", "Cache-Control": "no-cache" } }
    );

    if (!res.ok) {
      const symbols = SUPPORTED_COINS.map((c) => c.symbol).join(",");
      const fallbackRes = await fetch(
        `https://min-api.cryptocompare.com/data/pricemultifull?fsyms=${symbols}&tsyms=USD`
      );
      if (fallbackRes.ok) {
        const fbData = await fallbackRes.json();
        const prices: PriceData = {};
        for (const coin of SUPPORTED_COINS) {
          const d = fbData.RAW?.[coin.symbol]?.USD;
          prices[coin.id] = d
            ? { usd: d.PRICE ?? 0, usd_24h_change: d.CHANGEPCT24HOUR ?? 0 }
            : { usd: 0, usd_24h_change: 0 };
        }
        return prices;
      }
      throw new Error(`Price fetch failed with status: ${res.status}`);
    }

    const data = await res.json();
    const prices: PriceData = {};
    for (const coin of SUPPORTED_COINS) {
      const d = data[coin.coingeckoId];
      prices[coin.id] = d
        ? { usd: d.usd ?? 0, usd_24h_change: d.usd_24h_change ?? 0 }
        : { usd: 0, usd_24h_change: 0 };
    }
    return prices;
  } catch (error) {
    console.error("Failed to fetch prices:", error);
    return {
      pol: { usd: 0.25, usd_24h_change: 2.1 },
      ltc: { usd: 85, usd_24h_change: -1.0 },
      dgb: { usd: 0.008, usd_24h_change: 3.5 },
    };
  }
};

export const fetchPriceChart = async (coingeckoId: string, days: number = 7): Promise<{ time: string; price: number }[]> => {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coingeckoId}/market_chart?vs_currency=usd&days=${days}`
    );
    if (!res.ok) throw new Error("Chart fetch failed");
    const data = await res.json();
    return (data.prices as [number, number][]).map(([ts, price]) => ({
      time: new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      price: Math.round(price * 10000) / 10000,
    }));
  } catch {
    return [];
  }
};
