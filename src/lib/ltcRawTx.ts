/**
 * Raw LTC (P2WPKH) transaction builder for browser-side sending.
 * Used as fallback when BlockCypher's server-side tx-skeleton API is unreachable.
 *
 * Flow: fetch UTXOs → build raw segwit tx → sign with BIP143 → broadcast hex
 */

import { ethers } from "ethers";

// ── Helpers ──────────────────────────────────────────────────────────

const concat = (...arrays: Uint8Array[]): Uint8Array => {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) { result.set(a, offset); offset += a.length; }
  return result;
};

const sha256d = (data: Uint8Array): Uint8Array =>
  ethers.getBytes(ethers.sha256(ethers.getBytes(ethers.sha256(data))));

const uint32LE = (n: number): Uint8Array => {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n, true);
  return b;
};

const uint64LE = (n: bigint): Uint8Array => {
  const b = new Uint8Array(8);
  new DataView(b.buffer).setBigUint64(0, n, true);
  return b;
};

const encodeVarInt = (n: number): Uint8Array => {
  if (n < 0xfd) return new Uint8Array([n]);
  if (n <= 0xffff) {
    const b = new Uint8Array(3);
    b[0] = 0xfd; b[1] = n & 0xff; b[2] = (n >> 8) & 0xff;
    return b;
  }
  const b = new Uint8Array(5);
  b[0] = 0xfe;
  new DataView(b.buffer).setUint32(1, n, true);
  return b;
};

/** Reverse a hex-encoded txid to little-endian bytes */
const reverseTxid = (hex: string): Uint8Array => {
  const bytes = ethers.getBytes("0x" + hex);
  return bytes.reverse();
};

/** HASH160 = RIPEMD160(SHA256(x)) */
const hash160 = (data: Uint8Array): Uint8Array =>
  ethers.getBytes(ethers.ripemd160(ethers.sha256(data)));

// ── Bech32 decode ────────────────────────────────────────────────────

const CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";

const bech32PolyMod = (values: number[]): number => {
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const v of values) {
    const b = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) if ((b >> i) & 1) chk ^= GEN[i];
  }
  return chk;
};

const bech32Verify = (hrp: string, data5bit: number[]): boolean => {
  const hrpExpanded: number[] = [];
  for (let i = 0; i < hrp.length; i++) hrpExpanded.push(hrp.charCodeAt(i) >> 5);
  hrpExpanded.push(0);
  for (let i = 0; i < hrp.length; i++) hrpExpanded.push(hrp.charCodeAt(i) & 31);
  return bech32PolyMod(hrpExpanded.concat(data5bit)) === 1;
};

const decodeBech32 = (address: string): { witnessVersion: number; witnessProgram: Uint8Array } => {
  const lower = address.toLowerCase();
  const pos = lower.lastIndexOf("1");
  if (pos < 1) throw new Error("Invalid bech32");
  const hrp = lower.substring(0, pos);
  const dataStr = lower.substring(pos + 1);
  const data5: number[] = [];
  for (const ch of dataStr) {
    const idx = CHARSET.indexOf(ch);
    if (idx === -1) throw new Error("Invalid bech32 char");
    data5.push(idx);
  }
  if (!bech32Verify(hrp, data5)) throw new Error("Invalid bech32 checksum");
  const witnessVersion = data5[0];
  // Convert 5-bit (without version and checksum) to 8-bit
  const payload = data5.slice(1, data5.length - 6);
  let acc = 0, bits = 0;
  const ret: number[] = [];
  for (const v of payload) {
    acc = (acc << 5) | v;
    bits += 5;
    while (bits >= 8) { bits -= 8; ret.push((acc >> bits) & 0xff); }
  }
  return { witnessVersion, witnessProgram: new Uint8Array(ret) };
};

// ── Base58Check decode (for legacy addresses) ────────────────────────

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

const decodeBase58Check = (address: string): { version: number; hash: Uint8Array } => {
  let num = BigInt(0);
  for (const ch of address) {
    const idx = BASE58.indexOf(ch);
    if (idx === -1) throw new Error("Invalid base58 char");
    num = num * 58n + BigInt(idx);
  }
  let hex = num.toString(16);
  // Leading 1s in base58 = leading zero bytes
  let leadingZeros = 0;
  for (const ch of address) { if (ch === "1") leadingZeros++; else break; }
  hex = "00".repeat(leadingZeros) + (hex.length % 2 ? "0" : "") + hex;
  while (hex.length < 50) hex = "0" + hex; // ensure 25 bytes minimum
  const bytes = ethers.getBytes("0x" + hex);
  // Last 4 bytes are checksum
  const payload = bytes.slice(0, bytes.length - 4);
  return { version: payload[0], hash: payload.slice(1, 21) };
};

// ── Address → scriptPubKey ───────────────────────────────────────────

export const addressToScriptPubKey = (address: string): Uint8Array => {
  if (address.toLowerCase().startsWith("ltc1")) {
    const { witnessProgram } = decodeBech32(address);
    if (witnessProgram.length === 20) {
      // P2WPKH: OP_0 PUSH20
      return concat(new Uint8Array([0x00, 0x14]), witnessProgram);
    }
    if (witnessProgram.length === 32) {
      // P2WSH: OP_0 PUSH32
      return concat(new Uint8Array([0x00, 0x20]), witnessProgram);
    }
    throw new Error("Unsupported witness program length");
  }

  // Legacy address
  const { version, hash } = decodeBase58Check(address);

  if (version === 0x30) {
    // P2PKH (LTC mainnet): OP_DUP OP_HASH160 PUSH20 <hash> OP_EQUALVERIFY OP_CHECKSIG
    return concat(new Uint8Array([0x76, 0xa9, 0x14]), hash, new Uint8Array([0x88, 0xac]));
  }
  if (version === 0x32 || version === 0x05) {
    // P2SH: OP_HASH160 PUSH20 <hash> OP_EQUAL
    return concat(new Uint8Array([0xa9, 0x14]), hash, new Uint8Array([0x87]));
  }

  throw new Error(`Unsupported LTC address version 0x${version.toString(16)}`);
};

// ── UTXO fetching ────────────────────────────────────────────────────

export interface UTXO {
  txid: string;
  vout: number;
  value: number; // satoshis
}

export const fetchUTXOs = async (address: string): Promise<UTXO[]> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`https://litecoinspace.org/api/address/${address}/utxo`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`UTXO fetch ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("Bad UTXO response");
    return data.map((u: any) => ({ txid: String(u.txid), vout: Number(u.vout), value: Number(u.value) }));
  } finally {
    clearTimeout(timer);
  }
};

// ── DER signature encoding ──────────────────────────────────────────

const trimAndPad = (bytes: Uint8Array): Uint8Array => {
  let start = 0;
  while (start < bytes.length - 1 && bytes[start] === 0) start++;
  const trimmed = bytes.slice(start);
  if (trimmed[0] & 0x80) return concat(new Uint8Array([0x00]), trimmed);
  return trimmed;
};

const buildDerSig = (rHex: string, sHex: string): Uint8Array => {
  const r = trimAndPad(ethers.getBytes(rHex));
  const s = trimAndPad(ethers.getBytes(sHex));
  const innerLen = r.length + s.length + 4;
  return concat(
    new Uint8Array([0x30, innerLen, 0x02, r.length]),
    r,
    new Uint8Array([0x02, s.length]),
    s,
    new Uint8Array([0x01]), // SIGHASH_ALL
  );
};

// ── Build & sign raw segwit P2WPKH transaction ──────────────────────

export const buildAndSignRawTx = (
  utxos: UTXO[],
  toAddress: string,
  amountSats: number,
  feeSats: number,
  fromAddress: string,
  privateKeyHex: string,   // no 0x prefix
  publicKeyHex: string,    // no 0x prefix, compressed (33 bytes)
): string => {
  // Select UTXOs (largest first)
  const sorted = [...utxos].sort((a, b) => b.value - a.value);
  const selected: UTXO[] = [];
  let totalIn = 0;
  for (const u of sorted) {
    selected.push(u);
    totalIn += u.value;
    if (totalIn >= amountSats + feeSats) break;
  }
  if (totalIn < amountSats + feeSats) throw new Error("Insufficient UTXOs for amount + fee");

  const changeSats = totalIn - amountSats - feeSats;

  // Build outputs
  const toScript = addressToScriptPubKey(toAddress);
  const outputParts: Uint8Array[] = [];
  let outputCount = 1;

  // Output 1: recipient
  outputParts.push(concat(uint64LE(BigInt(amountSats)), encodeVarInt(toScript.length), toScript));

  // Output 2: change (skip if dust ≤ 546)
  if (changeSats > 546) {
    outputCount++;
    const changeScript = addressToScriptPubKey(fromAddress);
    outputParts.push(concat(uint64LE(BigInt(changeSats)), encodeVarInt(changeScript.length), changeScript));
  }

  const allOutputs = concat(encodeVarInt(outputCount), ...outputParts);

  // ── BIP143 sighash components ──

  const hashPrevouts = sha256d(concat(...selected.map(u => concat(reverseTxid(u.txid), uint32LE(u.vout)))));
  const hashSequence = sha256d(concat(...selected.map(() => uint32LE(0xffffffff))));
  const hashOutputs = sha256d(concat(...outputParts));

  // pubkey hash for scriptCode
  const pubKeyBytes = ethers.getBytes("0x" + publicKeyHex);
  const pkHash = hash160(pubKeyBytes);

  // scriptCode for P2WPKH (25 bytes with length prefix)
  const scriptCode = concat(
    new Uint8Array([0x19, 0x76, 0xa9, 0x14]),
    pkHash,
    new Uint8Array([0x88, 0xac]),
  );

  const signingKey = new ethers.SigningKey("0x" + privateKeyHex);
  const witnesses: Uint8Array[] = [];

  for (const utxo of selected) {
    // BIP143 preimage
    const preimage = concat(
      uint32LE(2),           // nVersion
      hashPrevouts,
      hashSequence,
      reverseTxid(utxo.txid), uint32LE(utxo.vout),  // outpoint
      scriptCode,
      uint64LE(BigInt(utxo.value)),    // amount
      uint32LE(0xffffffff),            // nSequence
      hashOutputs,
      uint32LE(0),           // nLocktime
      uint32LE(1),           // SIGHASH_ALL
    );

    const sigHash = sha256d(preimage);
    const sig = signingKey.sign(sigHash);
    const derSig = buildDerSig(sig.r, sig.s);

    // Witness stack: <sig> <pubkey>
    witnesses.push(concat(
      new Uint8Array([0x02]),
      encodeVarInt(derSig.length), derSig,
      encodeVarInt(pubKeyBytes.length), pubKeyBytes,
    ));
  }

  // ── Assemble full segwit transaction ──
  const rawTx = concat(
    uint32LE(2),                            // version
    new Uint8Array([0x00, 0x01]),            // segwit marker + flag
    encodeVarInt(selected.length),           // input count
    ...selected.map(u => concat(
      reverseTxid(u.txid),
      uint32LE(u.vout),
      new Uint8Array([0x00]),                // empty scriptSig
      uint32LE(0xffffffff),                  // sequence
    )),
    allOutputs,
    ...witnesses,
    uint32LE(0),                             // locktime
  );

  // Return hex without 0x prefix
  return ethers.hexlify(rawTx).slice(2);
};

// ── Broadcast raw transaction hex ────────────────────────────────────

export const broadcastRawTx = async (rawHex: string): Promise<string> => {
  // Try LitecoinSpace
  try {
    const res = await fetch("https://litecoinspace.org/api/tx", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: rawHex,
    });
    if (res.ok) {
      const txid = await res.text();
      return txid.trim();
    }
    const errText = await res.text().catch(() => "");
    console.warn("LitecoinSpace broadcast failed:", res.status, errText);
  } catch (e) {
    console.warn("LitecoinSpace broadcast error:", e);
  }

  // Try chain.so
  try {
    const res = await fetch("https://chain.so/api/v2/send_tx/LTC", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tx_hex: rawHex }),
    });
    if (res.ok) {
      const data = await res.json();
      const txid = data?.data?.txid || data?.data?.tx_hex || "";
      if (txid) return txid;
    }
  } catch {
    // fall through
  }

  // Try BlockCypher push
  try {
    const res = await fetch("https://api.blockcypher.com/v1/ltc/main/txs/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tx: rawHex }),
    });
    if (res.ok) {
      const data = await res.json();
      return data?.tx?.hash || "";
    }
  } catch {
    // fall through
  }

  throw new Error("All broadcast endpoints failed. Please try again later.");
};
