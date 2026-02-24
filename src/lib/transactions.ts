import { SUPPORTED_COINS, type CoinConfig } from "./coins";

export interface OnChainTransaction {
  coin: string;
  type: "send" | "receive";
  to: string;
  from: string;
  amount: string;
  hash: string;
  timestamp: number;
}

// Fetch POL transactions from PolygonScan (free, no API key needed for basic)
const fetchPolTransactions = async (address: string): Promise<OnChainTransaction[]> => {
  try {
    const res = await fetch(
      `https://api.polygonscan.com/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=25&sort=desc`
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (data.status !== "1" || !Array.isArray(data.result)) return [];

    return data.result.map((tx: any) => ({
      coin: "POL",
      type: tx.to?.toLowerCase() === address.toLowerCase() ? "receive" : "send",
      to: tx.to || "",
      from: tx.from || "",
      amount: (parseFloat(tx.value) / 1e18).toFixed(6),
      hash: tx.hash,
      timestamp: parseInt(tx.timeStamp) * 1000,
    }));
  } catch (error) {
    console.warn("Failed to fetch POL transactions:", error);
    return [];
  }
};

// Fetch LTC transactions from Blockchair (free tier)
const fetchLtcTransactions = async (address: string): Promise<OnChainTransaction[]> => {
  try {
    const res = await fetch(
      `https://api.blockcypher.com/v1/ltc/main/addrs/${address}?limit=25`
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.txrefs && !data.unconfirmed_txrefs) return [];

    const txrefs = [...(data.txrefs || []), ...(data.unconfirmed_txrefs || [])];
    return txrefs.slice(0, 25).map((tx: any) => ({
      coin: "LTC",
      type: tx.tx_output_n >= 0 && !tx.spent ? "receive" : "send",
      to: address,
      from: "",
      amount: (tx.value / 1e8).toFixed(8),
      hash: tx.tx_hash,
      timestamp: tx.confirmed ? new Date(tx.confirmed).getTime() : Date.now(),
    }));
  } catch (error) {
    console.warn("Failed to fetch LTC transactions:", error);
    return [];
  }
};

// Fetch DGB transactions from DigiExplorer
const fetchDgbTransactions = async (address: string): Promise<OnChainTransaction[]> => {
  try {
    const res = await fetch(
      `https://digiexplorer.info/api/txs/?address=${address}&pageNum=0`
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.txs || !Array.isArray(data.txs)) return [];

    return data.txs.slice(0, 25).map((tx: any) => {
      const isReceive = tx.vout?.some((out: any) =>
        out.scriptPubKey?.addresses?.includes(address)
      );
      const amount = tx.vout?.reduce((sum: number, out: any) => {
        if (out.scriptPubKey?.addresses?.includes(address)) {
          return sum + parseFloat(out.value || "0");
        }
        return sum;
      }, 0) || 0;

      return {
        coin: "DGB",
        type: isReceive ? "receive" : "send",
        to: address,
        from: tx.vin?.[0]?.addr || "",
        amount: amount.toFixed(8),
        hash: tx.txid,
        timestamp: (tx.time || tx.blocktime || Math.floor(Date.now() / 1000)) * 1000,
      };
    });
  } catch (error) {
    console.warn("Failed to fetch DGB transactions:", error);
    return [];
  }
};

// Fetch all on-chain transactions for all coins
export const fetchOnChainTransactions = async (
  addresses: Record<string, string>
): Promise<OnChainTransaction[]> => {
  const results = await Promise.allSettled([
    addresses.pol ? fetchPolTransactions(addresses.pol) : Promise.resolve([]),
    addresses.ltc ? fetchLtcTransactions(addresses.ltc) : Promise.resolve([]),
    addresses.dgb ? fetchDgbTransactions(addresses.dgb) : Promise.resolve([]),
  ]);

  const allTxs: OnChainTransaction[] = [];
  for (const result of results) {
    if (result.status === "fulfilled") {
      allTxs.push(...result.value);
    }
  }

  return allTxs.sort((a, b) => b.timestamp - a.timestamp);
};
