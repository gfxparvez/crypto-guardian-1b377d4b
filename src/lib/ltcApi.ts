import type { OnChainTransaction } from "./transactions";

const SATOSHIS = 1e8;

const fetchWithTimeout = async (url: string, timeoutMs = 8000): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });
  } finally {
    clearTimeout(timer);
  }
};

const toLtc = (sats: number): string => (Math.max(0, sats) / SATOSHIS).toFixed(8);

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

const balanceFromBlockCypher = async (address: string): Promise<string> => {
  const res = await fetchWithTimeout(`https://api.blockcypher.com/v1/ltc/main/addrs/${address}/balance`);
  if (!res.ok) throw new Error(`BlockCypher ${res.status}`);
  const data = await res.json();
  const sats = Number(data.balance || 0) + Number(data.unconfirmed_balance || 0);
  return toLtc(sats);
};

const balanceFromLitecoinSpace = async (address: string): Promise<string> => {
  const res = await fetchWithTimeout(`https://litecoinspace.org/api/address/${address}`);
  if (!res.ok) throw new Error(`LitecoinSpace ${res.status}`);

  const data = await res.json();
  const chainSats = Number(data?.chain_stats?.funded_txo_sum || 0) - Number(data?.chain_stats?.spent_txo_sum || 0);
  const mempoolSats = Number(data?.mempool_stats?.funded_txo_sum || 0) - Number(data?.mempool_stats?.spent_txo_sum || 0);
  return toLtc(chainSats + mempoolSats);
};

const balanceFromChainSo = async (address: string): Promise<string> => {
  const res = await fetchWithTimeout(`https://chain.so/api/v3/address_summary/LTC/${address}`);
  if (!res.ok) throw new Error(`Chain.so ${res.status}`);

  const data = await res.json();
  const confirmed = Number.parseFloat(data?.data?.confirmed_balance ?? "0");
  const unconfirmed = Number.parseFloat(data?.data?.unconfirmed_balance ?? "0");

  if (!Number.isFinite(confirmed) || !Number.isFinite(unconfirmed)) {
    throw new Error("Chain.so invalid balance");
  }

  return (Math.max(0, confirmed + unconfirmed)).toFixed(8);
};

const balanceFromBlockchair = async (address: string): Promise<string> => {
  const res = await fetchWithTimeout(`https://api.blockchair.com/litecoin/dashboards/address/${address}`);
  if (!res.ok) throw new Error(`Blockchair ${res.status}`);
  const data = await res.json();
  const addrData = data?.data?.[address];
  if (!addrData) throw new Error("Blockchair: no address data");
  const sats = Number(addrData.address?.balance || 0);
  return toLtc(sats);
};

export const fetchLtcBalance = async (address: string): Promise<BalanceResult> => {
  const providers = [
    { name: "BlockCypher", fn: () => balanceFromBlockCypher(address) },
    { name: "LitecoinSpace", fn: () => balanceFromLitecoinSpace(address) },
    { name: "ChainSo", fn: () => balanceFromChainSo(address) },
    { name: "Blockchair", fn: () => balanceFromBlockchair(address) },
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

const txsFromBlockCypher = async (address: string): Promise<OnChainTransaction[]> => {
  const res = await fetchWithTimeout(`https://api.blockcypher.com/v1/ltc/main/addrs/${address}/full?limit=25`);
  if (!res.ok) throw new Error(`BlockCypher ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data?.txs)) return [];

  return data.txs.map((tx: any) => {
    const lower = address.toLowerCase();
    const isInput = tx.inputs?.some((inp: any) => inp.addresses?.some((a: string) => a.toLowerCase() === lower));

    const amountSats = isInput
      ? tx.outputs?.reduce((sum: number, out: any) => {
          if (!out.addresses?.some((a: string) => a.toLowerCase() === lower)) return sum + Number(out.value || 0);
          return sum;
        }, 0) || 0
      : tx.outputs?.reduce((sum: number, out: any) => {
          if (out.addresses?.some((a: string) => a.toLowerCase() === lower)) return sum + Number(out.value || 0);
          return sum;
        }, 0) || 0;

    return {
      coin: "LTC",
      type: isInput ? "send" : "receive",
      to: isInput
        ? tx.outputs?.find((o: any) => !o.addresses?.some((a: string) => a.toLowerCase() === lower))?.addresses?.[0] || ""
        : address,
      from: isInput ? address : tx.inputs?.[0]?.addresses?.[0] || "",
      amount: toLtc(amountSats),
      hash: tx.hash,
      timestamp: tx.confirmed ? new Date(tx.confirmed).getTime() : Date.now(),
    } as OnChainTransaction;
  });
};

const txsFromLitecoinSpace = async (address: string): Promise<OnChainTransaction[]> => {
  const res = await fetchWithTimeout(`https://litecoinspace.org/api/address/${address}/txs`);
  if (!res.ok) throw new Error(`LitecoinSpace ${res.status}`);
  const txs = await res.json();
  if (!Array.isArray(txs)) return [];

  const lower = address.toLowerCase();

  return txs.slice(0, 25).map((tx: any) => {
    const vin = Array.isArray(tx?.vin) ? tx.vin : [];
    const vout = Array.isArray(tx?.vout) ? tx.vout : [];

    const isSend = vin.some((input: any) => input?.prevout?.scriptpubkey_address?.toLowerCase() === lower);
    const receivedSats = vout.reduce((sum: number, out: any) => {
      if (out?.scriptpubkey_address?.toLowerCase() === lower) return sum + Number(out?.value || 0);
      return sum;
    }, 0);
    const sentSats = vout.reduce((sum: number, out: any) => {
      const outAddr = out?.scriptpubkey_address?.toLowerCase();
      if (outAddr && outAddr !== lower) return sum + Number(out?.value || 0);
      return sum;
    }, 0);

    const ts = Number(tx?.status?.block_time || 0);

    return {
      coin: "LTC",
      type: isSend ? "send" : "receive",
      to: isSend
        ? vout.find((out: any) => out?.scriptpubkey_address?.toLowerCase() !== lower)?.scriptpubkey_address || ""
        : address,
      from: isSend
        ? address
        : vin.find((input: any) => input?.prevout?.scriptpubkey_address)?.prevout?.scriptpubkey_address || "",
      amount: toLtc(isSend ? sentSats : receivedSats),
      hash: tx?.txid || "",
      timestamp: ts > 0 ? ts * 1000 : Date.now(),
    } as OnChainTransaction;
  }).filter((tx) => !!tx.hash);
};

const txsFromChainSo = async (address: string): Promise<OnChainTransaction[]> => {
  const res = await fetchWithTimeout(`https://chain.so/api/v3/transactions/LTC/${address}/1`);
  if (!res.ok) throw new Error(`Chain.so ${res.status}`);

  const data = await res.json();
  const txs = data?.data?.transactions || data?.data?.txs || [];
  if (!Array.isArray(txs)) return [];

  return txs.slice(0, 25).map((tx: any) => {
    const direction = String(tx?.direction || tx?.type || "").toLowerCase();
    const isSend = direction.includes("out") || direction.includes("send");
    const value = Number.parseFloat(String(tx?.value ?? tx?.amount ?? tx?.received_value ?? "0"));
    const time = Number(tx?.time ?? tx?.timestamp ?? 0);

    return {
      coin: "LTC",
      type: isSend ? "send" : "receive",
      to: isSend ? (tx?.recipient || tx?.to || "") : address,
      from: isSend ? address : (tx?.sender || tx?.from || ""),
      amount: Number.isFinite(value) ? value.toFixed(8) : "0.00000000",
      hash: tx?.txid || tx?.tx_hash || tx?.hash || "",
      timestamp: time > 0 ? time * 1000 : Date.now(),
    } as OnChainTransaction;
  }).filter((tx) => !!tx.hash);
};

const txsFromBlockchair = async (address: string): Promise<OnChainTransaction[]> => {
  const res = await fetchWithTimeout(`https://api.blockchair.com/litecoin/dashboards/address/${address}?limit=25&transaction_details=true`);
  if (!res.ok) throw new Error(`Blockchair ${res.status}`);
  const data = await res.json();
  const addrData = data?.data?.[address];
  if (!addrData?.transactions) return [];

  return (addrData.transactions || []).slice(0, 25).map((txHash: string) => ({
    coin: "LTC",
    type: "receive",
    to: address,
    from: "",
    amount: "0.00000000",
    hash: txHash,
    timestamp: Date.now(),
  } as OnChainTransaction));
};

export const fetchLtcTransactions = async (address: string): Promise<TransactionsResult> => {
  const providers = [
    { name: "BlockCypher", fn: () => txsFromBlockCypher(address) },
    { name: "LitecoinSpace", fn: () => txsFromLitecoinSpace(address) },
    { name: "ChainSo", fn: () => txsFromChainSo(address) },
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

export const fetchLtcFee = async (): Promise<number> => {
  try {
    const res = await fetchWithTimeout("https://api.blockcypher.com/v1/ltc/main");
    if (!res.ok) throw new Error("BlockCypher fee failed");
    const data = await res.json();
    const feePerKb = Number(data.medium_fee_per_kb || 10000);
    return Math.ceil((feePerKb / 1000) * 250) / SATOSHIS;
  } catch {
    try {
      const res = await fetchWithTimeout("https://litecoinspace.org/api/v1/fees/recommended");
      if (!res.ok) throw new Error("LitecoinSpace fee failed");
      const data = await res.json();
      const satPerVbyte = Number(data?.halfHourFee || data?.hourFee || data?.minimumFee || 1);
      return Math.ceil(satPerVbyte * 250) / SATOSHIS;
    } catch {
      return 0.0001;
    }
  }
};

export const checkTxConfirmation = async (txHash: string): Promise<{ confirmed: boolean; source: string }> => {
  try {
    const res = await fetchWithTimeout(`https://api.blockcypher.com/v1/ltc/main/txs/${txHash}`);
    if (res.ok) {
      const data = await res.json();
      return { confirmed: Boolean(data.confirmations && data.confirmations > 0), source: "BlockCypher" };
    }
  } catch {
    // fallback below
  }

  try {
    const res = await fetchWithTimeout(`https://litecoinspace.org/api/tx/${txHash}`);
    if (res.ok) {
      const data = await res.json();
      return { confirmed: Boolean(data?.status?.confirmed), source: "LitecoinSpace" };
    }
  } catch {
    // fallback below
  }

  try {
    const res = await fetchWithTimeout(`https://api.blockchair.com/litecoin/dashboards/transaction/${txHash}`);
    if (res.ok) {
      const data = await res.json();
      const txData = data?.data?.[txHash];
      return { confirmed: Boolean(txData?.transaction?.block_id && txData.transaction.block_id > 0), source: "Blockchair" };
    }
  } catch {
    // no-op
  }

  return { confirmed: false, source: "none" };
};
