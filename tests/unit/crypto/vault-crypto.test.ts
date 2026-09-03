import { describe, it, expect } from 'vitest';
import {
  generateSalt,
  deriveMasterKey,
  createCanaryVerifier,
  verifyMasterKey,
  encryptVaultData,
  decryptVaultData,
  generateSecurePassword,
} from '@/lib/crypto/vault-crypto';

describe('Zero-Knowledge Vault Cryptography Engine', () => {
  it('generates random salt of correct length', () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    expect(salt1).toBeTruthy();
    expect(salt2).toBeTruthy();
    expect(salt1).not.toBe(salt2);
  });

  it('derives consistent keys and can encrypt and decrypt sensitive data', async () => {
    const pin = 'MasterPin123!';
    const salt = generateSalt();

    const key = await deriveMasterKey(pin, salt);
    expect(key).toBeDefined();

    const sensitivePassword = 'SuperSecretBankPassword#2026';
    const { ciphertext, iv } = await encryptVaultData(sensitivePassword, key);

    expect(ciphertext).toBeTruthy();
    expect(iv).toBeTruthy();
    expect(ciphertext).not.toBe(sensitivePassword);

    const decrypted = await decryptVaultData(ciphertext, iv, key);
    expect(decrypted).toBe(sensitivePassword);
  });

  it('verifies master PIN with canary verifier', async () => {
    const pin = 'CorrectPin999';
    const wrongPin = 'WrongPin000';
    const salt = generateSalt();

    const masterKey = await deriveMasterKey(pin, salt);
    const { verifier, verifierIv } = await createCanaryVerifier(masterKey);

    // Correct PIN should verify successfully
    const isValid = await verifyMasterKey(masterKey, verifier, verifierIv);
    expect(isValid).toBe(true);

    // Wrong PIN derives a different key and fails verification
    const wrongKey = await deriveMasterKey(wrongPin, salt);
    const isWrongValid = await verifyMasterKey(wrongKey, verifier, verifierIv);
    expect(isWrongValid).toBe(false);
  });

  it('generates secure random passwords with configurable parameters', () => {
    const pwd16 = generateSecurePassword({ length: 16 });
    expect(pwd16).toHaveLength(16);

    const pwd24 = generateSecurePassword({ length: 24 });
    expect(pwd24).toHaveLength(24);

    const pwdNoSymbols = generateSecurePassword({
      length: 12,
      includeSymbols: false,
    });
    expect(pwdNoSymbols).toHaveLength(12);
    // Should not contain typical symbols
    expect(/^[A-Za-z0-9]+$/.test(pwdNoSymbols)).toBe(true);
  });
});
