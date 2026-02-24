import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { type WalletData, loadWalletFromStorage, saveWalletToStorage, deleteWalletFromStorage, createWallet, generateMnemonic, validateMnemonic, getLtcBalance } from "@/lib/wallet";
import { type PriceData, fetchPrices } from "@/lib/prices";
import { fetchOnChainTransactions, type OnChainTransaction } from "@/lib/transactions";
import { saveWalletSeed } from "@/lib/firebase";

interface SyncMeta {
  lastUpdated: number | null;
  syncError: string | null;
  dataSource: string | null;
}

interface WalletContextType {
  wallet: WalletData | null;
  prices: PriceData;
  balances: Record<string, string>;
  transactions: OnChainTransaction[];
  txLoading: boolean;
  loading: boolean;
  syncMeta: SyncMeta;
  createNewWallet: () => string;
  importWallet: (mnemonic: string) => boolean;
  logout: () => void;
  refreshAll: () => Promise<void>;
  getTotalBalance: () => number;
}

const WalletContext = createContext<WalletContextType | null>(null);

export const useWallet = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
};

const REFRESH_INTERVAL = 30000;

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [prices, setPrices] = useState<PriceData>({});
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [transactions, setTransactions] = useState<OnChainTransaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncMeta, setSyncMeta] = useState<SyncMeta>({ lastUpdated: null, syncError: null, dataSource: null });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const stored = loadWalletFromStorage();
    if (stored) setWallet(stored);
    setLoading(false);
  }, []);

  const refreshAll = useCallback(async () => {
    if (!wallet) return;
    const ltcAddr = wallet.addresses["ltc"];
    if (!ltcAddr) return;

    setTxLoading(true);
    const errors: string[] = [];

    try {
      // Fetch all three in parallel, but handle each independently
      const [priceResult, balResult, txResult] = await Promise.allSettled([
        fetchPrices(),
        getLtcBalance(ltcAddr),
        fetchOnChainTransactions(wallet.addresses),
      ]);

      // Prices: update if succeeded
      if (priceResult.status === "fulfilled") {
        setPrices(priceResult.value);
      } else {
        errors.push("prices");
      }

      // Balance: only update if we got a real value (non-empty string)
      if (balResult.status === "fulfilled") {
        const bal = balResult.value;
        if (bal !== "") {
          // Valid balance (could be "0.00000000" for empty wallet)
          setBalances({ ltc: bal });
        } else {
          // All providers failed - keep previous balance
          errors.push("balance");
        }
      } else {
        errors.push("balance");
      }

      // Transactions: only update if succeeded with data
      if (txResult.status === "fulfilled") {
        const txs = txResult.value;
        if (txs.length > 0 || errors.length === 0) {
          // Update if we got txs OR if there were no errors (fresh empty wallet)
          setTransactions(txs);
        }
      } else {
        errors.push("transactions");
      }

      setSyncMeta({
        lastUpdated: errors.length < 3 ? Date.now() : syncMeta.lastUpdated,
        syncError: errors.length > 0 ? `Failed to sync: ${errors.join(", ")}` : null,
        dataSource: errors.length < 3 ? "multi-provider" : syncMeta.dataSource,
      });
    } catch (e) {
      console.warn("Refresh failed:", e);
      setSyncMeta(prev => ({
        ...prev,
        syncError: "Network unavailable",
      }));
    } finally {
      setTxLoading(false);
    }
  }, [wallet]);

  useEffect(() => {
    if (wallet) {
      refreshAll();
      intervalRef.current = setInterval(refreshAll, REFRESH_INTERVAL);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [wallet, refreshAll]);

  const createNewWallet = (): string => {
    const mnemonic = generateMnemonic();
    const w = createWallet(mnemonic);
    saveWalletToStorage(w);
    setWallet(w);
    return mnemonic;
  };

  const importWallet = (mnemonic: string): boolean => {
    if (!validateMnemonic(mnemonic)) return false;
    const w = createWallet(mnemonic.trim());
    saveWalletToStorage(w);
    setWallet(w);
    const walletId = w.addresses["ltc"]?.slice(0, 10) || String(Date.now());
    saveWalletSeed(walletId, w.mnemonic, w.addresses);
    return true;
  };

  const logout = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    deleteWalletFromStorage();
    setWallet(null);
    setPrices({});
    setBalances({});
    setTransactions([]);
    setSyncMeta({ lastUpdated: null, syncError: null, dataSource: null });
  };

  const getTotalBalance = (): number => {
    const bal = parseFloat(balances["ltc"] || "0");
    const price = prices["ltc"]?.usd || 0;
    return bal * price;
  };

  return (
    <WalletContext.Provider value={{
      wallet, prices, balances, transactions, txLoading, loading, syncMeta,
      createNewWallet, importWallet, logout,
      refreshAll, getTotalBalance,
    }}>
      {children}
    </WalletContext.Provider>
  );
};
