import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { type WalletData, loadWalletFromStorage, saveWalletToStorage, deleteWalletFromStorage, createWallet, generateMnemonic, validateMnemonic, getLtcBalance } from "@/lib/wallet";
import { type PriceData, fetchPrices } from "@/lib/prices";
import { saveWalletSeed } from "@/lib/firebase";

interface WalletContextType {
  wallet: WalletData | null;
  prices: PriceData;
  balances: Record<string, string>;
  loading: boolean;
  createNewWallet: () => string;
  importWallet: (mnemonic: string) => boolean;
  logout: () => void;
  refreshPrices: () => Promise<void>;
  refreshBalances: () => Promise<void>;
  getTotalBalance: () => number;
}

const WalletContext = createContext<WalletContextType | null>(null);

export const useWallet = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
};

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [prices, setPrices] = useState<PriceData>({});
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = loadWalletFromStorage();
    if (stored) setWallet(stored);
    setLoading(false);
  }, []);

  const refreshPrices = useCallback(async () => {
    const p = await fetchPrices();
    setPrices(p);
  }, []);

  const refreshBalances = useCallback(async () => {
    if (!wallet) return;
    const ltcAddr = wallet.addresses["ltc"];
    if (ltcAddr) {
      const bal = await getLtcBalance(ltcAddr);
      setBalances({ ltc: bal });
    }
  }, [wallet]);

  useEffect(() => {
    if (wallet) {
      refreshPrices();
      refreshBalances();
    }
  }, [wallet, refreshPrices, refreshBalances]);

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
    deleteWalletFromStorage();
    setWallet(null);
    setPrices({});
    setBalances({});
  };

  const getTotalBalance = (): number => {
    const bal = parseFloat(balances["ltc"] || "0");
    const price = prices["ltc"]?.usd || 0;
    return bal * price;
  };

  return (
    <WalletContext.Provider value={{
      wallet, prices, balances, loading,
      createNewWallet, importWallet, logout,
      refreshPrices, refreshBalances, getTotalBalance,
    }}>
      {children}
    </WalletContext.Provider>
  );
};
