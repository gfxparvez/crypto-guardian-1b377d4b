import type { OnChainTransaction } from "./transactions";

// ── Shared fetch helper with timeout ─────────────────────────────────

const fetchWithTimeout = async (url: string, timeoutMs = 8000): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
};

// ── Result types ─────────────────────────────────────────────────────

export interface BalanceResult {
  balance: string;
  source: string;
  error?: string;
}

export interface TransactionsResult {
  transactions: OnChainTransaction[];
  source: string;
  error?: string;
}

// ── Balance providers ────────────────────────────────────────────────

const balanceFromBlockCypher = async (address: string): Promise<string> => {
  const res = await fetchWithTimeout(`https://api.blockcypher.com/v1/ltc/main/addrs/${address}/balance`);
  if (!res.ok) throw new Error(`BlockCypher ${res.status}`);
  const data = await res.json();
  const satoshis = (data.balance || 0) + (data.unconfirmed_balance || 0);
  return (satoshis / 1e8).toFixed(8);
};

const balanceFromBlockchair = async (address: string): Promise<string> => {
  const res = await fetchWithTimeout(`https://api.blockchair.com/litecoin/dashboards/address/${address}`);
  if (!res.ok) throw new Error(`Blockchair ${res.status}`);
  const data = await res.json();
  const addrData = data?.data?.[address];
  if (!addrData) throw new Error("Blockchair: no address data");
  const satoshis = (addrData.address?.balance || 0) + (addrData.address?.balance_usd ? 0 : 0);
  // Blockchair returns balance in satoshis
  return (satoshis / 1e8).toFixed(8);
};

const balanceFromSoChain = async (address: string): Promise<string> => {
  const res = await fetchWithTimeout(`https://sochain.com/api/v3/balance/LTC/${address}`);
  if (!res.ok) throw new Error(`SoChain ${res.status}`);
  const data = await res.json();
  const confirmed = parseFloat(data?.data?.confirmed_balance || "0");
  const unconfirmed = parseFloat(data?.data?.unconfirmed_balance || "0");
  return (confirmed + unconfirmed).toFixed(8);
};

export const fetchLtcBalance = async (address: string): Promise<BalanceResult> => {
  const providers = [
    { name: "BlockCypher", fn: () => balanceFromBlockCypher(address) },
    { name: "Blockchair", fn: () => balanceFromBlockchair(address) },
    { name: "SoChain", fn: () => balanceFromSoChain(address) },
  ];

  const errors: string[] = [];
  for (const provider of providers) {
    try {
      const balance = await provider.fn();
      return { balance, source: provider.name };
    } catch (e: any) {
      errors.push(`${provider.name}: ${e.message}`);
      console.warn(`LTC balance provider ${provider.name} failed:`, e.message);
    }
  }

  return { balance: "", source: "none", error: errors.join("; ") };
};

// ── Transaction providers ────────────────────────────────────────────

const txsFromBlockCypher = async (address: string): Promise<OnChainTransaction[]> => {
  const res = await fetchWithTimeout(
    `https://api.blockcypher.com/v1/ltc/main/addrs/${address}/full?limit=25`
  );
  if (!res.ok) throw new Error(`BlockCypher ${res.status}`);
  const data = await res.json();
  if (!data.txs || !Array.isArray(data.txs)) return [];

  return data.txs.map((tx: any) => {
    const isInput = tx.inputs?.some((inp: any) =>
      inp.addresses?.some((a: string) => a.toLowerCase() === address.toLowerCase())
    );

    let amount = 0;
    if (isInput) {
      amount = tx.outputs?.reduce((sum: number, out: any) => {
        if (!out.addresses?.some((a: string) => a.toLowerCase() === address.toLowerCase())) {
          return sum + (out.value || 0);
        }
        return sum;
      }, 0) || 0;
    } else {
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
    } as OnChainTransaction;
  });
};

const txsFromBlockchair = async (address: string): Promise<OnChainTransaction[]> => {
  const res = await fetchWithTimeout(
    `https://api.blockchair.com/litecoin/dashboards/address/${address}?limit=25&transaction_details=true`
  );
  if (!res.ok) throw new Error(`Blockchair ${res.status}`);
  const data = await res.json();
  const addrData = data?.data?.[address];
  if (!addrData?.transactions) return [];

  // Blockchair returns transaction hashes; we map what we can
  return (addrData.transactions || []).slice(0, 25).map((txHash: string) => {
    return {
      coin: "LTC",
      type: "receive" as const,
      to: address,
      from: "",
      amount: "0",
      hash: txHash,
      timestamp: Date.now(),
    } as OnChainTransaction;
  });
};

export const fetchLtcTransactions = async (address: string): Promise<TransactionsResult> => {
  const providers = [
    { name: "BlockCypher", fn: () => txsFromBlockCypher(address) },
    { name: "Blockchair", fn: () => txsFromBlockchair(address) },
  ];

  const errors: string[] = [];
  for (const provider of providers) {
    try {
      const transactions = await provider.fn();
      return { transactions, source: provider.name };
    } catch (e: any) {
      errors.push(`${provider.name}: ${e.message}`);
      console.warn(`LTC tx provider ${provider.name} failed:`, e.message);
    }
  }

  return { transactions: [], source: "none", error: errors.join("; ") };
};

// ── Fee estimation with fallback ─────────────────────────────────────

export const fetchLtcFee = async (): Promise<number> => {
  try {
    const res = await fetchWithTimeout("https://api.blockcypher.com/v1/ltc/main");
    if (!res.ok) throw new Error("BlockCypher fee failed");
    const data = await res.json();
    const feePerKb = data.medium_fee_per_kb || 10000;
    return Math.ceil((feePerKb / 1000) * 250) / 1e8;
  } catch {
    return 0.0001;
  }
};

// ── Tx confirmation polling with fallback ────────────────────────────

export const checkTxConfirmation = async (txHash: string): Promise<{ confirmed: boolean; source: string }> => {
  // Try BlockCypher
  try {
    const res = await fetchWithTimeout(`https://api.blockcypher.com/v1/ltc/main/txs/${txHash}`);
    if (res.ok) {
      const data = await res.json();
      if (data.confirmations && data.confirmations > 0) {
        return { confirmed: true, source: "BlockCypher" };
      }
      return { confirmed: false, source: "BlockCypher" };
    }
  } catch { /* fall through */ }

  // Try Blockchair
  try {
    const res = await fetchWithTimeout(`https://api.blockchair.com/litecoin/dashboards/transaction/${txHash}`);
    if (res.ok) {
      const data = await res.json();
      const txData = data?.data?.[txHash];
      if (txData?.transaction?.block_id && txData.transaction.block_id > 0) {
        return { confirmed: true, source: "Blockchair" };
      }
      return { confirmed: false, source: "Blockchair" };
    }
  } catch { /* fall through */ }

  return { confirmed: false, source: "none" };
};
