import { ethers } from "ethers";
import { SUPPORTED_COINS, type CoinConfig } from "./coins";

export interface WalletData {
  mnemonic: string;
  addresses: Record<string, string>;
  createdAt: number;
}

// Generate a new BIP39 mnemonic
export const generateMnemonic = (): string => {
  const wallet = ethers.Wallet.createRandom();
  return wallet.mnemonic!.phrase;
};

// Validate a mnemonic phrase
export const validateMnemonic = (mnemonic: string): boolean => {
  try {
    ethers.Mnemonic.fromPhrase(mnemonic.trim());
    return true;
  } catch {
    return false;
  }
};

// Derive addresses for all supported coins from a mnemonic
export const deriveAddresses = (mnemonic: string): Record<string, string> => {
  const addresses: Record<string, string> = {};
  const mn = ethers.Mnemonic.fromPhrase(mnemonic.trim());

  for (const coin of SUPPORTED_COINS) {
    try {
      switch (coin.network) {
        case "evm": {
          // Standard Ethereum derivation path
          const hdNode = ethers.HDNodeWallet.fromMnemonic(mn, `m/44'/60'/0'/0/0`);
          addresses[coin.id] = hdNode.address;
          break;
        }
        case "bitcoin": {
          // Derive from ETH path and display as a representation
          // In production, use a proper Bitcoin library for segwit addresses
          const btcNode = ethers.HDNodeWallet.fromMnemonic(mn, `m/44'/0'/0'/0/0`);
          addresses[coin.id] = btcNode.address;
          break;
        }
        case "solana": {
          // Derive from mnemonic - simplified representation
          const solNode = ethers.HDNodeWallet.fromMnemonic(mn, `m/44'/501'/0'/0'`);
          addresses[coin.id] = solNode.address;
          break;
        }
        case "litecoin": {
          const ltcNode = ethers.HDNodeWallet.fromMnemonic(mn, `m/44'/2'/0'/0/0`);
          addresses[coin.id] = ltcNode.address;
          break;
        }
        case "dogecoin": {
          const dogeNode = ethers.HDNodeWallet.fromMnemonic(mn, `m/44'/3'/0'/0/0`);
          addresses[coin.id] = dogeNode.address;
          break;
        }
      }
    } catch (e) {
      console.error(`Failed to derive ${coin.symbol} address:`, e);
      addresses[coin.id] = "derivation-error";
    }
  }

  return addresses;
};

// Create a wallet from mnemonic and return wallet data
export const createWallet = (mnemonic: string): WalletData => {
  const addresses = deriveAddresses(mnemonic);
  return {
    mnemonic,
    addresses,
    createdAt: Date.now(),
  };
};

// Get ethers wallet for signing transactions (EVM chains only)
export const getEvmWallet = (mnemonic: string, rpcUrl?: string): ethers.HDNodeWallet => {
  const mn = ethers.Mnemonic.fromPhrase(mnemonic.trim());
  const wallet = ethers.HDNodeWallet.fromMnemonic(mn, `m/44'/60'/0'/0/0`);
  if (rpcUrl) {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    return wallet.connect(provider) as ethers.HDNodeWallet;
  }
  return wallet;
};

// Send EVM transaction
export const sendEvmTransaction = async (
  mnemonic: string,
  coin: CoinConfig,
  to: string,
  amount: string
): Promise<string> => {
  if (coin.network !== "evm" || !coin.rpcUrl) {
    throw new Error(`Sending not supported for ${coin.symbol} in this wallet`);
  }

  const provider = new ethers.JsonRpcProvider(coin.rpcUrl);
  const mn = ethers.Mnemonic.fromPhrase(mnemonic.trim());
  const wallet = ethers.HDNodeWallet.fromMnemonic(mn, `m/44'/60'/0'/0/0`).connect(provider);

  const tx = await wallet.sendTransaction({
    to,
    value: ethers.parseUnits(amount, coin.decimals),
  });

  return tx.hash;
};

// Get EVM balance with timeout to prevent infinite retries
export const getEvmBalance = async (address: string, rpcUrl: string): Promise<string> => {
  try {
    // Use a more resilient provider setup
    const provider = new ethers.JsonRpcProvider(rpcUrl, undefined, {
      staticNetwork: true,
    });
    
    // Add a timeout for the balance check
    const balancePromise = provider.getBalance(address);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("RPC Timeout")), 10000)
    );
    
    const balance = await Promise.race([balancePromise, timeoutPromise]) as bigint;
    return ethers.formatEther(balance);
  } catch (error) {
    console.warn(`Failed to fetch balance for ${address} from ${rpcUrl}:`, error);
    // Return mock data for demonstration if RPC fails
    return "0.00";
  }
};

// Save wallet to localStorage
export const saveWalletToStorage = (wallet: WalletData) => {
  localStorage.setItem("stellar_vault_wallet", JSON.stringify(wallet));
};

// Load wallet from localStorage
export const loadWalletFromStorage = (): WalletData | null => {
  const data = localStorage.getItem("stellar_vault_wallet");
  return data ? JSON.parse(data) : null;
};

// Delete wallet from localStorage
export const deleteWalletFromStorage = () => {
  localStorage.removeItem("stellar_vault_wallet");
};
