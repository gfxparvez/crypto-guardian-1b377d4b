export interface OnChainTransaction {
  coin: string;
  type: "send" | "receive";
  to: string;
  from: string;
  amount: string;
  hash: string;
  timestamp: number;
}

// All actual fetching logic has moved to src/lib/ltcApi.ts
// This file now re-exports for backward compatibility

import { fetchLtcTransactions as fetchFromApi } from "./ltcApi";

export const fetchOnChainTransactions = async (
  addresses: Record<string, string>
): Promise<OnChainTransaction[]> => {
  if (!addresses.ltc) return [];
  const result = await fetchFromApi(addresses.ltc);
  return result.transactions.sort((a, b) => b.timestamp - a.timestamp);
};
