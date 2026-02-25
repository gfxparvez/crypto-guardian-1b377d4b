export interface PriceData {
  [coinId: string]: {
    usd: number;
    usd_24h_change: number;
  };
}

const fetchJsonWithTimeout = async (url: string, timeoutMs = 7000): Promise<any> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json", "Cache-Control": "no-cache" },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } finally {
    clearTimeout(timer);
  }
};

export const fetchPrices = async (): Promise<PriceData> => {
  const providers: Array<{ name: string; fn: () => Promise<{ usd: number; usd_24h_change: number }> }> = [
    {
      name: "CoinGecko",
      fn: async () => {
        const data = await fetchJsonWithTimeout(
          "https://api.coingecko.com/api/v3/simple/price?ids=litecoin&vs_currencies=usd&include_24hr_change=true"
        );
        const d = data?.litecoin;
        return {
          usd: Number(d?.usd ?? 0),
          usd_24h_change: Number(d?.usd_24h_change ?? 0),
        };
      },
    },
    {
      name: "CryptoCompare",
      fn: async () => {
        const data = await fetchJsonWithTimeout("https://min-api.cryptocompare.com/data/pricemultifull?fsyms=LTC&tsyms=USD");
        const d = data?.RAW?.LTC?.USD;
        return {
          usd: Number(d?.PRICE ?? 0),
          usd_24h_change: Number(d?.CHANGEPCT24HOUR ?? 0),
        };
      },
    },
    {
      name: "Coinbase",
      fn: async () => {
        const data = await fetchJsonWithTimeout("https://api.coinbase.com/v2/prices/LTC-USD/spot");
        return {
          usd: Number(data?.data?.amount ?? 0),
          usd_24h_change: 0,
        };
      },
    },
  ];

  const errors: string[] = [];

  for (const provider of providers) {
    try {
      const price = await provider.fn();
      if (Number.isFinite(price.usd) && price.usd > 0) {
        return { ltc: price };
      }
      throw new Error("Invalid price payload");
    } catch (error: any) {
      errors.push(`${provider.name}: ${error?.message || "unknown error"}`);
    }
  }

  throw new Error(`All price providers failed: ${errors.join("; ")}`);
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
