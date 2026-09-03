/**
 * ═══════════════════════════════════════════════════════════════
 * FinanzasAP — Zero-Knowledge Cryptography Engine (Vault)
 * ═══════════════════════════════════════════════════════════════
 *
 * Utiliza Web Crypto API nativa (disponible en navegadores modernos
 * y Node.js 16+ via globalThis.crypto.subtle) para:
 *
 * 1. Derivar una llave AES-GCM de 256 bits a partir del PIN maestro
 *    utilizando PBKDF2-HMAC-SHA256 con 100,000 iteraciones y una sal única.
 * 2. Cifrar/descifrar datos con AES-GCM (256 bits) y un IV aleatorio de 12 bytes por operación.
 * 3. Crear y verificar un canario ("VAULT_PIN_VALID_TOKEN") para validar si el PIN
 *    ingresado es correcto sin almacenar jamás la clave maestra.
 * 4. Generar contraseñas aleatorias seguras y configurables.
 */

const CANARY_STRING = 'PROYECAHORRO_VAULT_CANARY_V1_VALID';

/**
 * Acceso seguro a la API de Web Crypto tanto en cliente como en servidor/pruebas.
 */
function getCrypto(): Crypto {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto;
  }
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    return globalThis.crypto;
  }
  throw new Error('Web Crypto API no disponible en este entorno');
}

/**
 * Convierte un ArrayBuffer o Uint8Array a cadena Base64 estándar.
 */
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convierte una cadena Base64 a Uint8Array.
 */
export function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Genera una sal criptográfica aleatoria de 16 bytes.
 */
export function generateSalt(): string {
  const crypto = getCrypto();
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return bufferToBase64(salt);
}

/**
 * Deriva una clave simétrica AES-GCM-256 a partir del PIN o contraseña maestra
 * usando PBKDF2 con 100,000 rondas y la sal provista.
 */
export async function deriveMasterKey(pin: string, saltBase64: string): Promise<CryptoKey> {
  const crypto = getCrypto();
  const salt = base64ToBuffer(saltBase64);
  const enc = new TextEncoder();
  const pinBuffer = enc.encode(pin);

  // 1. Importar el PIN como llave base para derivación
  const baseKey = await crypto.subtle.importKey(
    'raw',
    pinBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // 2. Derivar la llave AES-GCM de 256 bits
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100_000,
      hash: 'SHA-256',
    },
    baseKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false, // No exportable para mayor seguridad en memoria
    ['encrypt', 'decrypt']
  );

  return derivedKey;
}

/**
 * Crea un verificador canario cifrado para guardar en el servidor.
 * Permite validar si un PIN es correcto en futuros desbloqueos.
 */
export async function createCanaryVerifier(
  key: CryptoKey
): Promise<{ verifier: string; verifierIv: string }> {
  const { ciphertext, iv } = await encryptVaultData(CANARY_STRING, key);
  return {
    verifier: ciphertext,
    verifierIv: iv,
  };
}

/**
 * Verifica si la clave maestra derivada es válida intentando descifrar el canario.
 * Retorna true si es correcta; false si el PIN es erróneo.
 */
export async function verifyMasterKey(
  key: CryptoKey,
  verifierBase64: string,
  verifierIvBase64: string
): Promise<boolean> {
  try {
    const decrypted = await decryptVaultData(verifierBase64, verifierIvBase64, key);
    return decrypted === CANARY_STRING;
  } catch {
    return false;
  }
}

/**
 * Cifra una cadena de texto arbitraria con AES-GCM-256.
 * Genera un IV único de 12 bytes si no se proporciona uno.
 */
export async function encryptVaultData(
  plainText: string,
  key: CryptoKey,
  customIv?: Uint8Array
): Promise<{ ciphertext: string; iv: string }> {
  const crypto = getCrypto();
  const iv = customIv || new Uint8Array(12);
  if (!customIv) {
    crypto.getRandomValues(iv);
  }

  const enc = new TextEncoder();
  const data = enc.encode(plainText);

  const encryptedBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    data
  );

  return {
    ciphertext: bufferToBase64(encryptedBuffer),
    iv: bufferToBase64(iv),
  };
}

/**
 * Descifra una cadena de texto en base64 con AES-GCM-256 usando el IV provisto.
 */
export async function decryptVaultData(
  ciphertextBase64: string,
  ivBase64: string,
  key: CryptoKey
): Promise<string> {
  const crypto = getCrypto();
  const ciphertext = base64ToBuffer(ciphertextBase64);
  const iv = base64ToBuffer(ivBase64);

  const decryptedBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    ciphertext
  );

  const dec = new TextDecoder();
  return dec.decode(decryptedBuffer);
}

/**
 * Generador de contraseñas aleatorias seguras y de alta entropía.
 */
export interface PasswordGeneratorOptions {
  length?: number;
  includeUppercase?: boolean;
  includeLowercase?: boolean;
  includeNumbers?: boolean;
  includeSymbols?: boolean;
}

export function generateSecurePassword(options: PasswordGeneratorOptions = {}): string {
  const {
    length = 16,
    includeUppercase = true,
    includeLowercase = true,
    includeNumbers = true,
    includeSymbols = true,
  } = options;

  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Sin I, O para evitar confusión
  const lower = 'abcdefghijkmnopqrstuvwxyz'; // Sin l para evitar confusión
  const numbers = '23456789'; // Sin 0, 1 para evitar confusión
  const symbols = '!@#$%^&*()-_=+[]{}<>?~';

  let charset = '';
  const mandatoryChars: string[] = [];

  if (includeUppercase) {
    charset += upper;
    mandatoryChars.push(upper[Math.floor(Math.random() * upper.length)]);
  }
  if (includeLowercase) {
    charset += lower;
    mandatoryChars.push(lower[Math.floor(Math.random() * lower.length)]);
  }
  if (includeNumbers) {
    charset += numbers;
    mandatoryChars.push(numbers[Math.floor(Math.random() * numbers.length)]);
  }
  if (includeSymbols) {
    charset += symbols;
    mandatoryChars.push(symbols[Math.floor(Math.random() * symbols.length)]);
  }

  if (!charset) {
    charset = lower + numbers;
  }

  const crypto = getCrypto();
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);

  const result: string[] = [...mandatoryChars];
  for (let i = result.length; i < length; i++) {
    const idx = randomValues[i] % charset.length;
    result.push(charset[idx]);
  }

  // Mezclar el resultado (Fisher-Yates shuffle)
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result.join('');
}
