// js/crypto-utils.js — AES-256-GCM + RSA-OAEP-4096 operations (Web Crypto API)
// NOTHING here is sent on-chain. Only hashes of outputs are recorded on-chain.
'use strict';

const CRYPTO_ALGO = 'AES-256-GCM + RSA-OAEP-4096 (SHA-256)';

// ── SHA-256 helpers ──────────────────────────────────────────────────────────

async function sha256Buffer(buffer) {
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return '0x' + Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('');
}

async function sha256Hex(hexStr) {
  const bytes = hexStr.startsWith('0x') ? hexStr.slice(2) : hexStr;
  const buf = new Uint8Array(bytes.match(/.{1,2}/g).map(b => parseInt(b, 16))).buffer;
  return sha256Buffer(buf);
}

async function sha256String(str) {
  const enc = new TextEncoder().encode(str);
  return sha256Buffer(enc.buffer);
}

// ── RSA-OAEP 4096 key pair ───────────────────────────────────────────────────

async function generateRSAKeyPair() {
  return crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),  // 65537
      hash: 'SHA-256',
    },
    true,   // extractable
    ['encrypt', 'decrypt']
  );
}

async function exportPublicKeyPEM(key) {
  const buf  = await crypto.subtle.exportKey('spki', key);
  const b64  = btoa(String.fromCharCode(...new Uint8Array(buf)));
  const lines = b64.match(/.{1,64}/g).join('\n');
  return '-----BEGIN PUBLIC KEY-----\n' + lines + '\n-----END PUBLIC KEY-----';
}

async function exportPrivateKeyPEM(key) {
  const buf  = await crypto.subtle.exportKey('pkcs8', key);
  const b64  = btoa(String.fromCharCode(...new Uint8Array(buf)));
  const lines = b64.match(/.{1,64}/g).join('\n');
  return '-----BEGIN PRIVATE KEY-----\n' + lines + '\n-----END PRIVATE KEY-----';
}

async function importPublicKeyPEM(pem) {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
  const buf  = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'spki', buf.buffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true, ['encrypt']
  );
}

async function importPrivateKeyPEM(pem) {
  const b64 = pem.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
  const buf  = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  return crypto.subtle.importKey(
    'pkcs8', buf.buffer,
    { name: 'RSA-OAEP', hash: 'SHA-256' },
    true, ['decrypt']
  );
}

// ── AES-256-GCM key ──────────────────────────────────────────────────────────

async function generateAESKey() {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true, ['encrypt', 'decrypt']
  );
}

async function exportAESKeyRaw(key) {
  return crypto.subtle.exportKey('raw', key);  // ArrayBuffer, 32 bytes
}

async function importAESKeyRaw(rawBuf) {
  return crypto.subtle.importKey(
    'raw', rawBuf,
    { name: 'AES-GCM' },
    true, ['encrypt', 'decrypt']
  );
}

// ── File encrypt / decrypt ───────────────────────────────────────────────────

async function encryptFile(fileBuffer, aesKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));  // 96-bit IV
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    fileBuffer
  );
  return { encrypted, iv };  // ArrayBuffer, Uint8Array
}

async function decryptFile(encryptedBuffer, aesKey, iv) {
  return crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    encryptedBuffer
  );
}

// ── AES key wrapping with RSA-OAEP ──────────────────────────────────────────

async function wrapAESKeyWithRSA(aesKey, rsaPublicKey) {
  const rawAES = await exportAESKeyRaw(aesKey);
  return crypto.subtle.encrypt(
    { name: 'RSA-OAEP' },
    rsaPublicKey,
    rawAES
  );  // ArrayBuffer — only hash of this goes on-chain
}

async function unwrapAESKeyWithRSA(wrappedKeyBuf, rsaPrivateKey) {
  const rawAES = await crypto.subtle.decrypt(
    { name: 'RSA-OAEP' },
    rsaPrivateKey,
    wrappedKeyBuf
  );
  return importAESKeyRaw(rawAES);
}

// ── Encrypted .enc file format ───────────────────────────────────────────────
// Layout: [4 bytes: wrapped key length] [wrapped key bytes] [12 bytes: IV] [encrypted file bytes]

function buildEncFile(wrappedKey, iv, encryptedFile) {
  const keyLen  = new ArrayBuffer(4);
  new DataView(keyLen).setUint32(0, wrappedKey.byteLength, false);
  const total = 4 + wrappedKey.byteLength + 12 + encryptedFile.byteLength;
  const out = new Uint8Array(total);
  let offset = 0;
  out.set(new Uint8Array(keyLen), offset);            offset += 4;
  out.set(new Uint8Array(wrappedKey), offset);        offset += wrappedKey.byteLength;
  out.set(iv, offset);                                offset += 12;
  out.set(new Uint8Array(encryptedFile), offset);
  return out.buffer;
}

function parseEncFile(encFileBuf) {
  const view    = new DataView(encFileBuf);
  const keyLen  = view.getUint32(0, false);
  const wrappedKey    = encFileBuf.slice(4, 4 + keyLen);
  const iv            = new Uint8Array(encFileBuf.slice(4 + keyLen, 4 + keyLen + 12));
  const encryptedData = encFileBuf.slice(4 + keyLen + 12);
  return { wrappedKey, iv, encryptedData };
}

// ── Full encrypt pipeline ────────────────────────────────────────────────────

async function encryptDocument(fileBuffer, rsaPublicKey) {
  const aesKey            = await generateAESKey();
  const { encrypted, iv } = await encryptFile(fileBuffer, aesKey);
  const wrappedKey        = await wrapAESKeyWithRSA(aesKey, rsaPublicKey);
  const encFileBuffer     = buildEncFile(wrappedKey, iv, encrypted);

  // Compute hashes — only these go on-chain
  const encFileHash = await sha256Buffer(encFileBuffer);
  const encKeyHash  = await sha256Buffer(wrappedKey);
  const ivHash      = await sha256Buffer(iv.buffer);

  return {
    encFileBuffer,   // save locally as .enc — NOT on-chain
    wrappedKey,      // save alongside .enc — NOT on-chain
    iv,              // save alongside .enc — NOT on-chain
    aesKey,          // in-memory only
    // Hashes for on-chain registration:
    encFileHash,
    encKeyHash,
    ivHash,
    algorithm: CRYPTO_ALGO,
  };
}

// ── Full decrypt pipeline ────────────────────────────────────────────────────

async function decryptDocument(encFileBuf, rsaPrivateKey) {
  const { wrappedKey, iv, encryptedData } = parseEncFile(encFileBuf);
  const aesKey        = await unwrapAESKeyWithRSA(wrappedKey, rsaPrivateKey);
  const decrypted     = await decryptFile(encryptedData, aesKey, iv);
  const restoredHash  = await sha256Buffer(decrypted);
  return { decrypted, restoredHash };
}
