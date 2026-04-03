import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';

const CryptoContext = createContext(null);

// Convert base64 → ArrayBuffer
const fromBase64 = (b64) => {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
};

// Convert ArrayBuffer → base64
const toBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

export const CryptoProvider = ({ children }) => {
  const { user, token } = useAuth();
  const keyPairRef = useRef(null);
  const sharedKeyCache = useRef(new Map()); // channelId → CryptoKey
  const [keyReady, setKeyReady] = useState(false);

  useEffect(() => {
    if (!user || !token) { setKeyReady(false); return; }
    initKeys();
  }, [user, token]);

  const initKeys = async () => {
    try {
      // Check for stored key pair in sessionStorage
      const storedPub = sessionStorage.getItem('ecdhPublic');
      const storedPriv = sessionStorage.getItem('ecdhPrivate');

      if (storedPub && storedPriv) {
        const publicKey = await crypto.subtle.importKey(
          'spki', fromBase64(storedPub), { name: 'ECDH', namedCurve: 'P-256' }, true, []
        );
        const privateKey = await crypto.subtle.importKey(
          'pkcs8', fromBase64(storedPriv), { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']
        );
        keyPairRef.current = { publicKey, privateKey };
      } else {
        // Generate new key pair
        const keyPair = await crypto.subtle.generateKey(
          { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']
        );
        keyPairRef.current = keyPair;

        // Export and cache in sessionStorage
        const pubExported = await crypto.subtle.exportKey('spki', keyPair.publicKey);
        const privExported = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
        sessionStorage.setItem('ecdhPublic', toBase64(pubExported));
        sessionStorage.setItem('ecdhPrivate', toBase64(privExported));
      }

      // Upload public key to server
      const pubExported = await crypto.subtle.exportKey('spki', keyPairRef.current.publicKey);
      await api.put('/keys/public', { publicKey: toBase64(pubExported) });
      setKeyReady(true);
    } catch (err) {
      console.error('Crypto init failed:', err);
    }
  };

  const getSharedKey = async (channelId, recipientPublicKeyB64) => {
    if (sharedKeyCache.current.has(channelId)) {
      return sharedKeyCache.current.get(channelId);
    }
    if (!keyPairRef.current) return null;

    try {
      const theirPubKey = await crypto.subtle.importKey(
        'spki', fromBase64(recipientPublicKeyB64),
        { name: 'ECDH', namedCurve: 'P-256' }, false, []
      );
      const sharedKey = await crypto.subtle.deriveKey(
        { name: 'ECDH', public: theirPubKey },
        keyPairRef.current.privateKey,
        { name: 'AES-GCM', length: 256 },
        false, ['encrypt', 'decrypt']
      );
      sharedKeyCache.current.set(channelId, sharedKey);
      return sharedKey;
    } catch (err) {
      console.error('Key derivation failed:', err);
      return null;
    }
  };

  const encryptMessage = async (channelId, recipientPublicKeyB64, plaintext) => {
    const key = await getSharedKey(channelId, recipientPublicKeyB64);
    if (!key) return null;
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
    return { ciphertext: toBase64(ciphertext), iv: toBase64(iv.buffer) };
  };

  const decryptMessage = async (channelId, recipientPublicKeyB64, ciphertext, iv) => {
    const key = await getSharedKey(channelId, recipientPublicKeyB64);
    if (!key) return '[Encrypted]';
    try {
      const plaintext = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: fromBase64(iv) },
        key,
        fromBase64(ciphertext)
      );
      return new TextDecoder().decode(plaintext);
    } catch {
      return '[Decryption failed]';
    }
  };

  const getPublicKeyFingerprint = async () => {
    if (!keyPairRef.current) return '';
    const exported = await crypto.subtle.exportKey('spki', keyPairRef.current.publicKey);
    const hash = await crypto.subtle.digest('SHA-256', exported);
    return toBase64(hash).substring(0, 16);
  };

  // ─── BACKUP & RESTORE (PBKDF2) ──────────────────────────────
  const deriveStorageKey = async (passphrase, salt) => {
    const encoder = new TextEncoder();
    const baseKey = await crypto.subtle.importKey(
      'raw', encoder.encode(passphrase), { name: 'PBKDF2' }, false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      baseKey, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
    );
  };

  const backupPrivateKey = async (passphrase) => {
    if (!keyPairRef.current) return false;
    try {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const storageKey = await deriveStorageKey(passphrase, salt);

      const exportedPriv = await crypto.subtle.exportKey('pkcs8', keyPairRef.current.privateKey);
      const encryptedPriv = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, storageKey, exportedPriv);

      const backupData = JSON.stringify({
        ciphertext: toBase64(encryptedPriv),
        iv: toBase64(iv.buffer),
        salt: toBase64(salt.buffer),
      });

      await api.post('/keys/backup', { privateKeyBackup: backupData });
      return true;
    } catch (err) {
      console.error('Backup failed:', err);
      return false;
    }
  };

  const restorePrivateKey = async (passphrase) => {
    try {
      const res = await api.get('/keys/backup/me');
      if (!res.data.privateKeyBackup) throw new Error('No backup found');

      const { ciphertext, iv, salt } = JSON.parse(res.data.privateKeyBackup);
      const storageKey = await deriveStorageKey(passphrase, fromBase64(salt));

      const decryptedPriv = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: fromBase64(iv) },
        storageKey,
        fromBase64(ciphertext)
      );

      const privateKey = await crypto.subtle.importKey(
        'pkcs8', decryptedPriv, { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']
      );

      // We also need the public key to complete the pair (retrieve from server or sessionStorage)
      const userRes = await api.get(`/keys/${user._id}`);
      const publicKey = await crypto.subtle.importKey(
        'spki', fromBase64(userRes.data.publicKey), { name: 'ECDH', namedCurve: 'P-256' }, true, []
      );

      keyPairRef.current = { publicKey, privateKey };
      
      // Update sessionStorage
      sessionStorage.setItem('ecdhPublic', userRes.data.publicKey);
      sessionStorage.setItem('ecdhPrivate', toBase64(decryptedPriv));
      
      setKeyReady(true);
      return true;
    } catch (err) {
      console.error('Restore failed:', err);
      return false;
    }
  };

  return (
    <CryptoContext.Provider value={{ 
        keyReady, 
        encryptMessage, 
        decryptMessage, 
        getPublicKeyFingerprint,
        backupPrivateKey,
        restorePrivateKey
    }}>
      {children}
    </CryptoContext.Provider>
  );
};

export const useCrypto = () => useContext(CryptoContext);
export default CryptoContext;
