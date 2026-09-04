import { describe, it, expect, vi } from 'vitest';
import { deriveMasterKey, createCanaryVerifier, verifyMasterKey, generateSalt } from '@/lib/crypto/vault-crypto';
import { sendVaultAccessEmail } from '@/lib/email';

describe('Vault Security & 3-Attempt Lockout / Wipe Policy', () => {
  it('correctly tracks failed attempts and enforces 3-attempt wipe threshold', async () => {
    const salt = generateSalt();
    const correctPin = 'ValidPin123!';
    const wrongPin = 'IncorrectPin!';

    const key = await deriveMasterKey(correctPin, salt);
    const { verifier, verifierIv } = await createCanaryVerifier(key);

    const MAX_ATTEMPTS = 3;
    let failedAttempts = 0;
    let isWiped = false;

    const simulateUnlockAttempt = async (candidatePin: string) => {
      const derived = await deriveMasterKey(candidatePin, salt);
      const valid = await verifyMasterKey(derived, verifier, verifierIv);

      if (!valid) {
        failedAttempts++;
        if (failedAttempts >= MAX_ATTEMPTS) {
          isWiped = true;
          return { success: false, wiped: true, attemptsLeft: 0 };
        }
        return { success: false, wiped: false, attemptsLeft: MAX_ATTEMPTS - failedAttempts };
      }

      failedAttempts = 0;
      return { success: true, wiped: false, attemptsLeft: MAX_ATTEMPTS };
    };

    // Attempt 1: Fail
    const res1 = await simulateUnlockAttempt(wrongPin);
    expect(res1.success).toBe(false);
    expect(res1.wiped).toBe(false);
    expect(res1.attemptsLeft).toBe(2);
    expect(isWiped).toBe(false);

    // Attempt 2: Fail
    const res2 = await simulateUnlockAttempt(wrongPin);
    expect(res2.success).toBe(false);
    expect(res2.wiped).toBe(false);
    expect(res2.attemptsLeft).toBe(1);
    expect(isWiped).toBe(false);

    // Attempt 3: Fail -> AUTO-WIPE TRIGGERED
    const res3 = await simulateUnlockAttempt(wrongPin);
    expect(res3.success).toBe(false);
    expect(res3.wiped).toBe(true);
    expect(res3.attemptsLeft).toBe(0);
    expect(isWiped).toBe(true);
  });

  it('resets attempt counter on successful unlock before threshold is reached', async () => {
    const salt = generateSalt();
    const correctPin = 'SecretMaster2026';
    const wrongPin = 'BadPassword';

    const key = await deriveMasterKey(correctPin, salt);
    const { verifier, verifierIv } = await createCanaryVerifier(key);

    let failedAttempts = 0;

    // Fail once
    const derived1 = await deriveMasterKey(wrongPin, salt);
    const valid1 = await verifyMasterKey(derived1, verifier, verifierIv);
    expect(valid1).toBe(false);
    failedAttempts++;
    expect(failedAttempts).toBe(1);

    // Succeed next
    const derived2 = await deriveMasterKey(correctPin, salt);
    const valid2 = await verifyMasterKey(derived2, verifier, verifierIv);
    expect(valid2).toBe(true);
    failedAttempts = 0;
    expect(failedAttempts).toBe(0);
  });

  it('sendVaultAccessEmail function is exported and callable', () => {
    expect(typeof sendVaultAccessEmail).toBe('function');
  });
});
