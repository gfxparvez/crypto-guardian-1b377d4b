import { ethers } from "ethers";

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

const pubkeyToBech32 = (compressedPubKey: string, hrp: string): string => {
  const sha256Hash = ethers.sha256(compressedPubKey);
  const pubkeyHash = ethers.ripemd160(sha256Hash);
  const hashBytes = ethers.getBytes(pubkeyHash);
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

  try {
    const ltcNode = ethers.HDNodeWallet.fromMnemonic(mn, `m/84'/2'/0'/0/0`);
    addresses["ltc"] = pubkeyToBech32(ltcNode.publicKey, "ltc");
  } catch (e) {
    console.error("Failed to derive LTC address:", e);
    addresses["ltc"] = "derivation-error";
  }

  return addresses;
};

export const createWallet = (mnemonic: string): WalletData => {
  const addresses = deriveAddresses(mnemonic);
  return { mnemonic, addresses, createdAt: Date.now() };
};

// ── LTC Balance via BlockCypher ──────────────────────────────────────

export const getLtcBalance = async (address: string): Promise<string> => {
  try {
    const res = await fetch(`https://api.blockcypher.com/v1/ltc/main/addrs/${address}/balance`);
    if (!res.ok) return "0";
    const data = await res.json();
    const satoshis = (data.balance || 0) + (data.unconfirmed_balance || 0);
    return (satoshis / 1e8).toFixed(8);
  } catch (error) {
    console.warn("Failed to fetch LTC balance:", error);
    return "0";
  }
};

// ── LTC Fee Estimation ───────────────────────────────────────────────

export const getLtcFeeEstimate = async (): Promise<number> => {
  try {
    const res = await fetch("https://api.blockcypher.com/v1/ltc/main");
    if (!res.ok) return 0.0001;
    const data = await res.json();
    const feePerKb = data.medium_fee_per_kb || 10000;
    // Estimate ~250 bytes for a simple P2WPKH tx
    const feeSatoshis = Math.ceil((feePerKb / 1000) * 250);
    return feeSatoshis / 1e8;
  } catch {
    return 0.0001; // fallback
  }
};

// ── Real LTC Send via BlockCypher ────────────────────────────────────

export interface SendLtcResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export const sendLtcTransaction = async (
  mnemonic: string,
  fromAddress: string,
  toAddress: string,
  amountLtc: number
): Promise<SendLtcResult> => {
  try {
    const mn = ethers.Mnemonic.fromPhrase(mnemonic.trim());
    const ltcNode = ethers.HDNodeWallet.fromMnemonic(mn, `m/84'/2'/0'/0/0`);
    const privateKeyHex = ltcNode.privateKey.slice(2); // remove 0x
    const publicKeyHex = ltcNode.publicKey.slice(2); // remove 0x prefix (compressed)

    const amountSatoshis = Math.round(amountLtc * 1e8);

    // Step 1: Create transaction skeleton
    const newTxRes = await fetch("https://api.blockcypher.com/v1/ltc/main/txs/new", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inputs: [{ addresses: [fromAddress] }],
        outputs: [{ addresses: [toAddress], value: amountSatoshis }],
      }),
    });

    if (!newTxRes.ok) {
      const errData = await newTxRes.json().catch(() => ({}));
      return { success: false, error: errData.errors?.[0]?.error || errData.error || "Failed to create transaction" };
    }

    const txSkeleton = await newTxRes.json();

    if (txSkeleton.errors && txSkeleton.errors.length > 0) {
      return { success: false, error: txSkeleton.errors[0].error || "Transaction creation failed" };
    }

    // Step 2: Sign each tosign hash
    const signingKey = new ethers.SigningKey("0x" + privateKeyHex);
    const signatures: string[] = [];
    const pubkeys: string[] = [];

    for (const tosign of txSkeleton.tosign) {
      const sig = signingKey.sign("0x" + tosign);
      // BlockCypher expects DER-encoded signature without 0x prefix
      const derSig = ethers.Signature.from(sig).serialized.slice(2);
      signatures.push(derSig);
      pubkeys.push(publicKeyHex);
    }

    // Step 3: Send signed transaction
    txSkeleton.signatures = signatures;
    txSkeleton.pubkeys = pubkeys;

    const sendRes = await fetch("https://api.blockcypher.com/v1/ltc/main/txs/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(txSkeleton),
    });

    if (!sendRes.ok) {
      const errData = await sendRes.json().catch(() => ({}));
      return { success: false, error: errData.errors?.[0]?.error || errData.error || "Failed to broadcast transaction" };
    }

    const result = await sendRes.json();
    return { success: true, txHash: result.tx?.hash || result.hash || "" };
  } catch (error: any) {
    console.error("LTC send error:", error);
    return { success: false, error: error.message || "Unknown error during send" };
  }
};

// ── Storage ──────────────────────────────────────────────────────────

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
