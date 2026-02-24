export interface OnChainTransaction {
  coin: string;
  type: "send" | "receive";
  to: string;
  from: string;
  amount: string;
  hash: string;
  timestamp: number;
}

// Fetch LTC transactions using BlockCypher full tx endpoint for accurate send/receive
const fetchLtcTransactions = async (address: string): Promise<OnChainTransaction[]> => {
  try {
    const res = await fetch(
      `https://api.blockcypher.com/v1/ltc/main/addrs/${address}/full?limit=25`
    );
    if (!res.ok) {
      // Fallback to basic txrefs
      return fetchLtcTransactionsFallback(address);
    }
    const data = await res.json();
    if (!data.txs || !Array.isArray(data.txs)) return [];

    return data.txs.map((tx: any) => {
      // Check if our address is in the inputs (sent)
      const isInput = tx.inputs?.some((inp: any) =>
        inp.addresses?.some((a: string) => a.toLowerCase() === address.toLowerCase())
      );

      // Calculate amount
      let amount = 0;
      if (isInput) {
        // Sent: sum outputs NOT to our address
        const totalOut = tx.outputs?.reduce((sum: number, out: any) => {
          if (!out.addresses?.some((a: string) => a.toLowerCase() === address.toLowerCase())) {
            return sum + (out.value || 0);
          }
          return sum;
        }, 0) || 0;
        amount = totalOut;
      } else {
        // Received: sum outputs TO our address
        amount = tx.outputs?.reduce((sum: number, out: any) => {
          if (out.addresses?.some((a: string) => a.toLowerCase() === address.toLowerCase())) {
            return sum + (out.value || 0);
          }
          return sum;
        }, 0) || 0;
      }

      const toAddr = isInput
        ? tx.outputs?.find((o: any) => !o.addresses?.some((a: string) => a.toLowerCase() === address.toLowerCase()))?.addresses?.[0] || ""
        : address;
      const fromAddr = isInput
        ? address
        : tx.inputs?.[0]?.addresses?.[0] || "";

      return {
        coin: "LTC",
        type: isInput ? "send" : "receive",
        to: toAddr,
        from: fromAddr,
        amount: (amount / 1e8).toFixed(8),
        hash: tx.hash,
        timestamp: tx.confirmed ? new Date(tx.confirmed).getTime() : Date.now(),
      };
    });
  } catch (error) {
    console.warn("Failed to fetch LTC transactions:", error);
    return [];
  }
};

// Fallback using txrefs
const fetchLtcTransactionsFallback = async (address: string): Promise<OnChainTransaction[]> => {
  try {
    const res = await fetch(
      `https://api.blockcypher.com/v1/ltc/main/addrs/${address}?limit=25`
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.txrefs && !data.unconfirmed_txrefs) return [];

    const txrefs = [...(data.txrefs || []), ...(data.unconfirmed_txrefs || [])];
    return txrefs.slice(0, 25).map((tx: any) => {
      // tx_input_n >= 0 means this address was an input (sent)
      // tx_output_n >= 0 and tx_input_n === -1 means received
      const isSend = tx.tx_input_n >= 0;

      return {
        coin: "LTC",
        type: isSend ? "send" : "receive",
        to: isSend ? "" : address,
        from: isSend ? address : "",
        amount: (tx.value / 1e8).toFixed(8),
        hash: tx.tx_hash,
        timestamp: tx.confirmed ? new Date(tx.confirmed).getTime() : Date.now(),
      };
    });
  } catch (error) {
    console.warn("Failed to fetch LTC transactions (fallback):", error);
    return [];
  }
};

export const fetchOnChainTransactions = async (
  addresses: Record<string, string>
): Promise<OnChainTransaction[]> => {
  if (!addresses.ltc) return [];
  const txs = await fetchLtcTransactions(addresses.ltc);
  return txs.sort((a, b) => b.timestamp - a.timestamp);
};
