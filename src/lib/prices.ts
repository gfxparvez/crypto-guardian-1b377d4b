export interface PriceData {
  [coinId: string]: {
    usd: number;
    usd_24h_change: number;
  };
}

export const fetchPrices = async (): Promise<PriceData> => {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=litecoin&vs_currencies=usd&include_24hr_change=true`,
      { headers: { "Accept": "application/json", "Cache-Control": "no-cache" } }
    );

    if (!res.ok) {
      const fallbackRes = await fetch(
        `https://min-api.cryptocompare.com/data/pricemultifull?fsyms=LTC&tsyms=USD`
      );
      if (fallbackRes.ok) {
        const fbData = await fallbackRes.json();
        const d = fbData.RAW?.LTC?.USD;
        return {
          ltc: d
            ? { usd: d.PRICE ?? 0, usd_24h_change: d.CHANGEPCT24HOUR ?? 0 }
            : { usd: 0, usd_24h_change: 0 },
        };
      }
      throw new Error(`Price fetch failed`);
    }

    const data = await res.json();
    const d = data.litecoin;
    return {
      ltc: d
        ? { usd: d.usd ?? 0, usd_24h_change: d.usd_24h_change ?? 0 }
        : { usd: 0, usd_24h_change: 0 },
    };
  } catch (error) {
    console.error("Failed to fetch prices:", error);
    return { ltc: { usd: 85, usd_24h_change: -1.0 } };
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
