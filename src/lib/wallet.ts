import { ethers } from "ethers";
import { SUPPORTED_COINS, type CoinConfig } from "./coins";

export interface WalletData {
  mnemonic: string;
  addresses: Record<string, string>;
  createdAt: number;
}

// ── Bech32 encoding ──────────────────────────────────────────────────
const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";

const bech32Polymod = (values: number[]): number => {
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const v of values) {
    const b = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) {
      if ((b >> i) & 1) chk ^= GEN[i];
    }
  }
  return chk;
};

const bech32HrpExpand = (hrp: string): number[] => {
  const ret: number[] = [];
  for (let i = 0; i < hrp.length; i++) ret.push(hrp.charCodeAt(i) >> 5);
  ret.push(0);
  for (let i = 0; i < hrp.length; i++) ret.push(hrp.charCodeAt(i) & 31);
  return ret;
};

const bech32CreateChecksum = (hrp: string, data: number[]): number[] => {
  const values = bech32HrpExpand(hrp).concat(data).concat([0, 0, 0, 0, 0, 0]);
  const polymod = bech32Polymod(values) ^ 1;
  const ret: number[] = [];
  for (let i = 0; i < 6; i++) ret.push((polymod >> (5 * (5 - i))) & 31);
  return ret;
};

const bech32Encode = (hrp: string, data: number[]): string => {
  const combined = data.concat(bech32CreateChecksum(hrp, data));
  let ret = hrp + "1";
  for (const d of combined) ret += CHARSET[d];
  return ret;
};

const convertBits = (data: Uint8Array, fromBits: number, toBits: number, pad: boolean): number[] => {
  let acc = 0;
  let bits = 0;
  const ret: number[] = [];
  const maxv = (1 << toBits) - 1;
  for (const value of data) {
    acc = (acc << fromBits) | value;
    bits += fromBits;
    while (bits >= toBits) {
      bits -= toBits;
      ret.push((acc >> bits) & maxv);
    }
  }
  if (pad) {
    if (bits > 0) ret.push((acc << (toBits - bits)) & maxv);
  }
  return ret;
};

// Create a bech32 native segwit (P2WPKH) address from a compressed public key
const pubkeyToBech32 = (compressedPubKey: string, hrp: string): string => {
  const sha256Hash = ethers.sha256(compressedPubKey);
  const pubkeyHash = ethers.ripemd160(sha256Hash);
  const hashBytes = ethers.getBytes(pubkeyHash);
  // witness version 0 + 20-byte pubkey hash converted to 5-bit groups
  const words = [0].concat(convertBits(hashBytes, 8, 5, true));
  return bech32Encode(hrp, words);
};

// ── Wallet functions ─────────────────────────────────────────────────

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
          // BIP84 native segwit: ltc1q... addresses
          const ltcNode = ethers.HDNodeWallet.fromMnemonic(mn, `m/84'/2'/0'/0/0`);
          addresses[coin.id] = pubkeyToBech32(ltcNode.publicKey, "ltc");
          break;
        }
        case "digibyte": {
          // BIP84 native segwit: dgb1q... addresses
          const dgbNode = ethers.HDNodeWallet.fromMnemonic(mn, `m/84'/20'/0'/0/0`);
          addresses[coin.id] = pubkeyToBech32(dgbNode.publicKey, "dgb");
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
