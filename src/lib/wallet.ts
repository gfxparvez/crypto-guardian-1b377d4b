import { ethers } from "ethers";
import { SUPPORTED_COINS, type CoinConfig } from "./coins";

export interface WalletData {
  mnemonic: string;
  addresses: Record<string, string>;
  createdAt: number;
}

// Convert a compressed public key to a P2PKH address with the given version byte
const pubkeyToP2PKH = (compressedPubKey: string, versionByte: number): string => {
  // Step 1: SHA256 of the public key
  const sha256Hash = ethers.sha256(compressedPubKey);
  // Step 2: RIPEMD160 of the SHA256 hash
  const pubkeyHash = ethers.ripemd160(sha256Hash);
  // Step 3: Prepend version byte
  const versionedPayload = ethers.concat([
    new Uint8Array([versionByte]),
    ethers.getBytes(pubkeyHash),
  ]);
  // Step 4: Double SHA256 for checksum
  const checksum1 = ethers.sha256(versionedPayload);
  const checksum2 = ethers.sha256(checksum1);
  const checksumBytes = ethers.getBytes(checksum2).slice(0, 4);
  // Step 5: Concatenate and Base58 encode
  const fullPayload = ethers.concat([versionedPayload, checksumBytes]);
  return ethers.encodeBase58(fullPayload);
};

export const generateMnemonic = (): string => {
  const wallet = ethers.Wallet.createRandom();
  return wallet.mnemonic!.phrase;
};

export const validateMnemonic = (mnemonic: string): boolean => {
  try {
    ethers.Mnemonic.fromPhrase(mnemonic.trim());
    return true;
  } catch {
    return false;
  }
};

export const deriveAddresses = (mnemonic: string): Record<string, string> => {
  const addresses: Record<string, string> = {};
  const mn = ethers.Mnemonic.fromPhrase(mnemonic.trim());

  for (const coin of SUPPORTED_COINS) {
    try {
      switch (coin.network) {
        case "evm": {
          const hdNode = ethers.HDNodeWallet.fromMnemonic(mn, `m/44'/60'/0'/0/0`);
          addresses[coin.id] = hdNode.address;
          break;
        }
        case "litecoin": {
          // LTC P2PKH addresses start with "L" (version byte 0x30)
          const ltcNode = ethers.HDNodeWallet.fromMnemonic(mn, `m/44'/2'/0'/0/0`);
          addresses[coin.id] = pubkeyToP2PKH(ltcNode.publicKey, 0x30);
          break;
        }
        case "digibyte": {
          // DGB P2PKH addresses start with "D" (version byte 0x1e)
          const dgbNode = ethers.HDNodeWallet.fromMnemonic(mn, `m/44'/20'/0'/0/0`);
          addresses[coin.id] = pubkeyToP2PKH(dgbNode.publicKey, 0x1e);
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

export const createWallet = (mnemonic: string): WalletData => {
  const addresses = deriveAddresses(mnemonic);
  return { mnemonic, addresses, createdAt: Date.now() };
};

export const getEvmWallet = (mnemonic: string, rpcUrl?: string): ethers.HDNodeWallet => {
  const mn = ethers.Mnemonic.fromPhrase(mnemonic.trim());
  const wallet = ethers.HDNodeWallet.fromMnemonic(mn, `m/44'/60'/0'/0/0`);
  if (rpcUrl) {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    return wallet.connect(provider) as ethers.HDNodeWallet;
  }
  return wallet;
};

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

export const getEvmBalance = async (address: string, rpcUrl: string): Promise<string> => {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl, undefined, { staticNetwork: true });
    const balancePromise = provider.getBalance(address);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("RPC Timeout")), 10000)
    );
    const balance = await Promise.race([balancePromise, timeoutPromise]) as bigint;
    return ethers.formatEther(balance);
  } catch (error) {
    console.warn(`Failed to fetch balance for ${address} from ${rpcUrl}:`, error);
    return "0.00";
  }
};

export const getEvmFeeEstimate = async (
  coin: CoinConfig,
  to: string,
  amount: string
): Promise<{ fee: string; total: string }> => {
  if (coin.network !== "evm" || !coin.rpcUrl) {
    return { fee: "0", total: amount };
  }
  try {
    const provider = new ethers.JsonRpcProvider(coin.rpcUrl);
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice ?? ethers.parseUnits("20", "gwei");
    const gasLimit = 21000n;
    const feeWei = gasPrice * gasLimit;
    const fee = ethers.formatUnits(feeWei, coin.decimals);
    const total = (parseFloat(amount || "0") + parseFloat(fee)).toString();
    return { fee, total };
  } catch (error) {
    console.warn("Failed to estimate fee:", error);
    return { fee: "0.0001", total: (parseFloat(amount || "0") + 0.0001).toString() };
  }
};

export const saveWalletToStorage = (wallet: WalletData) => {
  localStorage.setItem("stellar_vault_wallet", JSON.stringify(wallet));
};

export const loadWalletFromStorage = (): WalletData | null => {
  const data = localStorage.getItem("stellar_vault_wallet");
  return data ? JSON.parse(data) : null;
};

export const deleteWalletFromStorage = () => {
  localStorage.removeItem("stellar_vault_wallet");
};
