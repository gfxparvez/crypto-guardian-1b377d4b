import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { type WalletData, loadWalletFromStorage, saveWalletToStorage, deleteWalletFromStorage, createWallet, generateMnemonic, validateMnemonic, getLtcBalance } from "@/lib/wallet";
import { type PriceData, fetchPrices } from "@/lib/prices";
import { fetchOnChainTransactions, type OnChainTransaction } from "@/lib/transactions";
import { saveWalletSeed } from "@/lib/firebase";

interface WalletContextType {
  wallet: WalletData | null;
  prices: PriceData;
  balances: Record<string, string>;
  transactions: OnChainTransaction[];
  txLoading: boolean;
  loading: boolean;
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

const REFRESH_INTERVAL = 30000; // 30 seconds

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [prices, setPrices] = useState<PriceData>({});
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [transactions, setTransactions] = useState<OnChainTransaction[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const stored = loadWalletFromStorage();
    if (stored) setWallet(stored);
    setLoading(false);
  }, []);

  const refreshAll = useCallback(async () => {
    if (!wallet) return;

    // Fetch price, balance, and transactions in parallel
    const ltcAddr = wallet.addresses["ltc"];
    if (!ltcAddr) return;

    setTxLoading(true);

    try {
      const [priceData, bal, txs] = await Promise.all([
        fetchPrices(),
        getLtcBalance(ltcAddr),
        fetchOnChainTransactions(wallet.addresses),
      ]);

      setPrices(priceData);
      setBalances({ ltc: bal });
      setTransactions(txs);
    } catch (e) {
      console.warn("Refresh failed:", e);
    } finally {
      setTxLoading(false);
    }
  }, [wallet]);

  // Initial load + auto-refresh every 30s
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
  };

  const getTotalBalance = (): number => {
    const bal = parseFloat(balances["ltc"] || "0");
    const price = prices["ltc"]?.usd || 0;
    return bal * price;
  };

  return (
    <WalletContext.Provider value={{
      wallet, prices, balances, transactions, txLoading, loading,
      createNewWallet, importWallet, logout,
      refreshAll, getTotalBalance,
    }}>
      {children}
    </WalletContext.Provider>
  );
};
