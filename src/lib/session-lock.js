import { webcrypto } from 'crypto';

// JWT helpers

function splitLockedToken(lockedToken) {
  const substrings = lockedToken.split('.');
  const jwtElements = substrings.slice(0, 3);
  const jwtPayload = JSON.parse(atob(jwtElements[1]));

  const jwt = jwtElements.join('.');
  const timestampedJwt = substrings.slice(0, 4).join('.');
  const timestamp = substrings[3];
  const signature = substrings[4];
  const publicKey = jwtPayload.publicKey;

  return { jwt, timestampedJwt, timestamp, signature, publicKey };
}

// IndexedDB helpers

const dbName = 'session-lock-keystore';
const storeName = 'slkeystore';

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      db.createObjectStore(storeName);
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

async function getItem(key) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.get(key);

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

async function setItem(key, value) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.put(value, key);

    request.onsuccess = (event) => {
      resolve();
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

async function clearIdb() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.clear();

    request.onsuccess = (event) => {
      resolve();
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

// Core cryptographic functions

function ab2str(buf) {
  return String.fromCharCode.apply(null, new Uint8Array(buf));
}

function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

async function exportPublicKey(key) {
  const exportRaw = await window.crypto.subtle.exportKey('raw', key);
  const exportBuffer = new Uint8Array(exportRaw);
  const exportString = ab2str(exportBuffer);
  const exportB64 = btoa(exportString);

  return exportB64;
}

// To be run on the client/browser
async function generateKeyPair() {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    false,
    ['sign', 'verify'] // verify not strictly needed
  );

  await setItem('privateKey', keyPair.privateKey);

  const publicKey = await exportPublicKey(keyPair.publicKey);

  return publicKey;
}

async function lockToken(token) {
  const clientTimestamp = Date.now();
  const timestampedJwt = `${token}.${clientTimestamp}`;

  const privateKey = await getItem('privateKey');

  const signatureBuffer = await window.crypto.subtle.sign(
    {
      name: 'ECDSA',
      hash: { name: 'SHA-256' },
    },
    privateKey,
    new TextEncoder().encode(timestampedJwt)
  );

  const signatureString = ab2str(signatureBuffer);
  const signatureB64 = btoa(signatureString);

  const lockedToken = `${timestampedJwt}.${signatureB64}`;

  return lockedToken;
}

// To be run on the client/browser
async function importPublicKey(publicKeyB64) {
  const binaryString = atob(publicKeyB64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const publicKey = await webcrypto.subtle.importKey(
    'raw',
    bytes.buffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['verify']
  );

  return publicKey;
}

// To be run on the server
async function verifyLockedToken(lockedToken) {
  try {
    const tokenElements = splitLockedToken(lockedToken);
    const timestampedJwt = tokenElements.timestampedJwt;
    const signature = base64ToArrayBuffer(tokenElements.signature);
    const publicKey = await importPublicKey(tokenElements.publicKey);
    const timestamp = tokenElements.timestamp;

    const validInterval = Date.now() - timestamp <= 3000;

    const ec = new TextEncoder();
    const validSignature = await webcrypto.subtle.verify(
      { name: 'ECDSA', hash: { name: 'SHA-256' } },
      publicKey,
      signature,
      ec.encode(timestampedJwt)
    );

    const validation = !validInterval ? 'Token expired' : !validSignature ? 'Invalid signature' : `valid`;

    return validation;
  } catch (error) {
    console.log(error);
  }
}

module.exports = { splitLockedToken, clearIdb, generateKeyPair, lockToken, verifyLockedToken };
