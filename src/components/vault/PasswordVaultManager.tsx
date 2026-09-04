import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  generateSalt,
  deriveMasterKey,
  createCanaryVerifier,
  verifyMasterKey,
  encryptVaultData,
  decryptVaultData,
  generateSecurePassword,
} from '@/lib/crypto/vault-crypto';

interface EncryptedVaultItem {
  id: string;
  userId: string;
  title: string;
  category: string;
  websiteUrl: string | null;
  usernameEncrypted: string | null;
  passwordEncrypted: string;
  notesEncrypted: string | null;
  iv: string;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DecryptedItemData {
  username?: string;
  password?: string;
  notes?: string;
}

// ═══════════════════════════════════════════════════════════════
// ICONOS SVG
// ═══════════════════════════════════════════════════════════════

const SvgIcons = {
  all: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  ),
  banking: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 21h18M3 10h18M5 10v8m4-8v8m6-8v8m4-8v8M12 3l9 5H3l9-5z" />
    </svg>
  ),
  cards: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  email: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  streaming: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  social: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  ),
  notes: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  other: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  lock: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  ),
  unlock: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
    </svg>
  ),
  eye: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  eyeOff: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
    </svg>
  ),
  copy: (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  check: (
    <svg className="h-3.5 w-3.5 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
    </svg>
  ),
  edit: (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  trash: (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  sparkles: (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  globe: (
    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  ),
  shieldCheck: (
    <svg className="h-5 w-5 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
};

const CATEGORIES = [
  { id: 'all', label: 'Todos', icon: SvgIcons.all },
  { id: 'banking', label: 'Bancos y Finanzas', icon: SvgIcons.banking },
  { id: 'cards', label: 'Tarjetas', icon: SvgIcons.cards },
  { id: 'email', label: 'Correos', icon: SvgIcons.email },
  { id: 'streaming', label: 'Suscripciones / Streaming', icon: SvgIcons.streaming },
  { id: 'social', label: 'Redes y Cuentas', icon: SvgIcons.social },
  { id: 'notes', label: 'Notas Seguras / PINs', icon: SvgIcons.notes },
  { id: 'other', label: 'Otros', icon: SvgIcons.other },
];

const AUTO_LOCK_SECONDS = 900; // 15 minutos de inactividad

export default function PasswordVaultManager() {
  // Estado de inicialización y configuración
  const [loading, setLoading] = useState(true);
  const [hasVault, setHasVault] = useState<boolean | null>(null);
  const [salt, setSalt] = useState<string | null>(null);
  const [verifier, setVerifier] = useState<string | null>(null);
  const [verifierIv, setVerifierIv] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  // Clave maestra en memoria RAM (NUNCA guardada en disco ni storage)
  const [masterKey, setMasterKey] = useState<CryptoKey | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);

  // Formulario de Desbloqueo de Bóveda
  const [unlockPin, setUnlockPin] = useState('');
  const [showUnlockPin, setShowUnlockPin] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [showHintModal, setShowHintModal] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [vaultWiped, setVaultWiped] = useState(false);

  // Formulario de Setup Inicial
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [newHint, setNewHint] = useState('');
  const [showNewPin, setShowNewPin] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [settingUp, setSettingUp] = useState(false);

  // Lista de elementos de la bóveda
  const [items, setItems] = useState<EncryptedVaultItem[]>([]);
  const [decryptedCache, setDecryptedCache] = useState<Record<string, DecryptedItemData>>({});
  const [loadingItems, setLoadingItems] = useState(false);

  // ═══════════════════════════════════════════════════════════════
  // MODAL DEDICADO: VER CREDENCIALES SEGURAS
  // ═══════════════════════════════════════════════════════════════
  const [viewModalItem, setViewModalItem] = useState<EncryptedVaultItem | null>(null);
  const [viewModalPin, setViewModalPin] = useState('');
  const [showViewModalPin, setShowViewModalPin] = useState(false);
  const [viewModalError, setViewModalError] = useState<string | null>(null);
  const [isViewVerified, setIsViewVerified] = useState(false);
  const [viewDecrypted, setViewDecrypted] = useState<{ username: string; password: string; notes: string }>({
    username: '',
    password: '',
    notes: '',
  });
  const [showViewPassword, setShowViewPassword] = useState(false);
  const [verifyingView, setVerifyingView] = useState(false);

  // Filtros y Búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Modal Crear / Editar
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EncryptedVaultItem | null>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalCategory, setModalCategory] = useState('banking');
  const [modalUrl, setModalUrl] = useState('');
  const [modalUsername, setModalUsername] = useState('');
  const [modalPassword, setModalPassword] = useState('');
  const [modalNotes, setModalNotes] = useState('');
  const [modalIsFavorite, setModalIsFavorite] = useState(false);
  const [showModalPassword, setShowModalPassword] = useState(false);
  const [savingItem, setSavingItem] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Modal Generador de Contraseñas
  const [genModalOpen, setGenModalOpen] = useState(false);
  const [genLength, setGenLength] = useState(16);
  const [genUpper, setGenUpper] = useState(true);
  const [genLower, setGenLower] = useState(true);
  const [genNumbers, setGenNumbers] = useState(true);
  const [genSymbols, setGenSymbols] = useState(true);
  const [generatedResult, setGeneratedResult] = useState('');

  // Notificación de copiado
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modal Importar CSV de Contraseñas (Google Chrome, etc.)
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [parsedCsvItems, setParsedCsvItems] = useState<Array<{ title: string; url: string; username: string; password: string; note: string; category: string }>>([]);
  const [csvFileName, setCsvFileName] = useState('');
  const [csvPasteText, setCsvPasteText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  // Temporizador de Auto-bloqueo por inactividad
  const [secondsRemaining, setSecondsRemaining] = useState(AUTO_LOCK_SECONDS);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Cargar estado de la bóveda
  const fetchVaultSetup = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/vault/setup');
      const json = await res.json();
      if (res.ok) {
        setHasVault(json.hasVault);
        if (json.hasVault) {
          setSalt(json.salt);
          setVerifier(json.verifier);
          setVerifierIv(json.verifierIv);
          setHint(json.hint);
        }
      }
    } catch (e) {
      console.error('Error checking vault setup:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVaultSetup();
  }, []);

  // Función para autodetectar categoría según nombre o dominio
  const detectCategory = (url: string = '', name: string = ''): string => {
    const str = `${url} ${name}`.toLowerCase();
    if (/netflix|disney|spotify|prime|youtube|hbomax|hbo|crunchyroll|twitch|apple.*tv/.test(str)) return 'streaming';
    if (/banco|pichincha|guayaquil|pacifico|produbanco|bolivariano|austro|internacional|deuna|payphone|coop|jeep|coopmego|mutualista|diners|visa|mastercard/.test(str)) return 'banking';
    if (/tarjeta|credit.*card/.test(str)) return 'cards';
    if (/gmail|google|outlook|hotmail|yahoo|mail|icloud|proton/.test(str)) return 'email';
    if (/facebook|instagram|twitter|tiktok|linkedin|reddit|threads|whatsapp|telegram/.test(str)) return 'social';
    return 'other';
  };

  // Parser robusto para CSV de Google Passwords / Chrome
  const parseGooglePasswordsCsv = (text: string) => {
    const lines: string[] = [];
    let currentLine = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        inQuotes = !inQuotes;
        currentLine += char;
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (currentLine.trim()) {
          lines.push(currentLine);
        }
        currentLine = '';
        if (char === '\r' && text[i + 1] === '\n') {
          i++;
        }
      } else {
        currentLine += char;
      }
    }
    if (currentLine.trim()) {
      lines.push(currentLine);
    }

    if (lines.length < 2) return [];

    const parseLine = (line: string): string[] => {
      const cells: string[] = [];
      let cell = '';
      let insideQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          if (insideQuotes && line[i + 1] === '"') {
            cell += '"';
            i++;
          } else {
            insideQuotes = !insideQuotes;
          }
        } else if (c === ',' && !insideQuotes) {
          cells.push(cell.trim());
          cell = '';
        } else {
          cell += c;
        }
      }
      cells.push(cell.trim());
      return cells;
    };

    const headerCells = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/[\s_"]/g, ''));
    const nameIdx = headerCells.findIndex((h) => h === 'name' || h === 'title' || h === 'nombre');
    const urlIdx = headerCells.findIndex((h) => h === 'url' || h === 'website' || h === 'sitio');
    const userIdx = headerCells.findIndex((h) => h === 'username' || h === 'user' || h === 'usuario' || h === 'login');
    const passIdx = headerCells.findIndex((h) => h === 'password' || h === 'pass' || h === 'contraseña' || h === 'clave');
    const noteIdx = headerCells.findIndex((h) => h === 'note' || h === 'notes' || h === 'nota' || h === 'notas');

    if (passIdx === -1) {
      throw new Error('No se encontró columna de contraseña (password) en el archivo CSV');
    }

    const items: Array<{ title: string; url: string; username: string; password: string; note: string; category: string }> = [];

    for (let i = 1; i < lines.length; i++) {
      const row = parseLine(lines[i]);
      const password = row[passIdx] || '';
      if (!password) continue;

      const url = urlIdx !== -1 ? row[urlIdx] || '' : '';
      let rawName = nameIdx !== -1 ? row[nameIdx] || '' : '';
      if (!rawName && url) {
        try {
          rawName = new URL(url).hostname.replace(/^www\./, '');
        } catch {
          rawName = url;
        }
      }
      const title = rawName || 'Cuenta';
      const username = userIdx !== -1 ? row[userIdx] || '' : '';
      const note = noteIdx !== -1 ? row[noteIdx] || '' : '';

      items.push({
        title,
        url,
        username,
        password,
        note,
        category: detectCategory(url, title),
      });
    }

    return items;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    setImportError(null);
    setImportSuccess(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        const parsed = parseGooglePasswordsCsv(text);
        if (parsed.length === 0) {
          setImportError('No se encontraron contraseñas válidas en el archivo seleccionado');
          return;
        }
        setParsedCsvItems(parsed);
      } catch (err: any) {
        setImportError(err.message || 'Error al procesar el archivo CSV');
      }
    };
    reader.readAsText(file);
  };

  const handleProcessImport = async () => {
    if (!masterKey || parsedCsvItems.length === 0) return;
    try {
      setImporting(true);
      setImportError(null);

      // Cifrar todas las contraseñas con la llave maestra en memoria
      const encryptedBatch = [];
      for (const item of parsedCsvItems) {
        const { ciphertext: passwordEncrypted, iv } = await encryptVaultData(item.password, masterKey);
        let usernameEncrypted = null;
        if (item.username) {
          const res = await encryptVaultData(item.username, masterKey);
          usernameEncrypted = res.ciphertext;
        }
        let notesEncrypted = null;
        if (item.note) {
          const res = await encryptVaultData(item.note, masterKey);
          notesEncrypted = res.ciphertext;
        }

        encryptedBatch.push({
          title: item.title,
          category: item.category,
          websiteUrl: item.url || null,
          usernameEncrypted,
          passwordEncrypted,
          notesEncrypted,
          iv,
        });
      }

      const res = await fetch('/api/vault/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: encryptedBatch }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Error al guardar el lote de contraseñas');
      }

      setImportSuccess(`¡Se han importado ${json.count} contraseñas exitosamente a tu bóveda!`);
      await fetchVaultItems(masterKey);
      setTimeout(() => {
        setImportModalOpen(false);
        setParsedCsvItems([]);
        setCsvFileName('');
        setCsvPasteText('');
        setImportSuccess(null);
      }, 1600);
    } catch (err: any) {
      console.error('Error importing CSV:', err);
      setImportError(err.message || 'Error durante el cifrado e importación');
    } finally {
      setImporting(false);
    }
  };

  // Función de Bloqueo Inmediato
  const lockVault = useCallback(() => {
    setMasterKey(null);
    setIsUnlocked(false);
    setDecryptedCache({});
    setUnlockPin('');
    setUnlockError(null);
    setModalOpen(false);
    setGenModalOpen(false);
    setViewModalItem(null);
    setIsViewVerified(false);
  }, []);

  // Control de Inactividad (Sin bloqueo agresivo al cambiar de pestaña)
  const resetInactivityTimer = useCallback(() => {
    setSecondsRemaining(AUTO_LOCK_SECONDS);
  }, []);

  useEffect(() => {
    if (!isUnlocked) return;

    const handleActivity = () => resetInactivityTimer();
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('mousedown', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('scroll', handleActivity);

    timerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          lockVault();
          return AUTO_LOCK_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isUnlocked, lockVault, resetInactivityTimer]);

  // Cargar elementos cifrados de la bóveda
  const fetchVaultItems = async (keyToUse: CryptoKey) => {
    try {
      setLoadingItems(true);
      const res = await fetch('/api/vault/items');
      const json = await res.json();
      if (res.ok && Array.isArray(json.items)) {
        setItems(json.items);
        const newCache: Record<string, DecryptedItemData> = {};
        for (const item of json.items) {
          let password = '';
          let username = '';
          let notes = '';

          try {
            password = await decryptVaultData(item.passwordEncrypted, item.iv, keyToUse);
          } catch (err) {
            console.error('Error decrypting password:', item.id, err);
          }

          if (item.usernameEncrypted) {
            try {
              username = await decryptVaultData(item.usernameEncrypted, item.iv, keyToUse);
            } catch (err) {
              console.error('Error decrypting username:', item.id, err);
            }
          }

          if (item.notesEncrypted) {
            try {
              notes = await decryptVaultData(item.notesEncrypted, item.iv, keyToUse);
            } catch (err) {
              console.error('Error decrypting notes:', item.id, err);
            }
          }

          newCache[item.id] = { password, username, notes };
        }
        setDecryptedCache(newCache);
      }
    } catch (e) {
      console.error('Error fetching vault items:', e);
    } finally {
      setLoadingItems(false);
    }
  };

  // 2. Desbloquear Bóveda (Verificación en servidor con autodestrucción y alerta por correo)
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salt || !verifier || !verifierIv) return;
    if (!unlockPin) {
      setUnlockError('Ingresa tu PIN o contraseña maestra');
      return;
    }

    try {
      setUnlocking(true);
      setUnlockError(null);

      // 1. Validar intento en el servidor (control de 3 intentos y envío de correo)
      const res = await fetch('/api/vault/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: unlockPin }),
      });

      const json = await res.json();

      if (!res.ok) {
        if (json.wiped) {
          // AUTODESTRUCCIÓN TRAS 3 INTENTOS FALLIDOS
          setHasVault(false);
          setMasterKey(null);
          setIsUnlocked(false);
          setItems([]);
          setDecryptedCache({});
          setVaultWiped(true);
          setUnlockError(
            '🚨 Has fallado 3 intentos consecutivos. Por seguridad extrema, tu bóveda y todas las contraseñas han sido eliminadas permanentemente.'
          );
          return;
        }

        if (json.attemptsLeft !== undefined) {
          setAttemptsLeft(json.attemptsLeft);
        }
        setUnlockError(json.error || 'PIN o contraseña maestra incorrecta');
        return;
      }

      // 2. Desbloqueo exitoso (correo de seguridad enviado por el servidor)
      // Derivar la llave simétrica localmente en memoria para descifrar contraseñas
      const candidateKey = await deriveMasterKey(unlockPin, salt);
      setMasterKey(candidateKey);
      setIsUnlocked(true);
      setUnlockPin('');
      setAttemptsLeft(3);
      resetInactivityTimer();
      await fetchVaultItems(candidateKey);
    } catch (err: any) {
      console.error('Error unlocking vault:', err);
      setUnlockError('Error al procesar la clave de seguridad');
    } finally {
      setUnlocking(false);
    }
  };

  // 3. Crear Bóveda por Primera Vez
  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError(null);

    if (newPin.length < 6) {
      setSetupError('La clave maestra debe tener al menos 6 caracteres para ser segura');
      return;
    }
    if (newPin !== confirmPin) {
      setSetupError('Las contraseñas maestras no coinciden');
      return;
    }

    try {
      setSettingUp(true);
      const newSalt = generateSalt();
      const derived = await deriveMasterKey(newPin, newSalt);
      const { verifier: newVerifier, verifierIv: newVerifierIv } = await createCanaryVerifier(derived);

      const res = await fetch('/api/vault/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salt: newSalt,
          verifier: newVerifier,
          verifierIv: newVerifierIv,
          hint: newHint || null,
        }),
      });

      if (!res.ok) {
        throw new Error('Error al guardar la configuración en el servidor');
      }

      setHasVault(true);
      setSalt(newSalt);
      setVerifier(newVerifier);
      setVerifierIv(newVerifierIv);
      setHint(newHint || null);
      setMasterKey(derived);
      setIsUnlocked(true);
      setNewPin('');
      setConfirmPin('');
      setNewHint('');
      resetInactivityTimer();
    } catch (err: any) {
      console.error('Error setting up vault:', err);
      setSetupError(err.message || 'Error al configurar la bóveda');
    } finally {
      setSettingUp(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // ABRIR MODAL PARA VER CREDENCIALES
  // ═══════════════════════════════════════════════════════════════
  const openViewCredentialsModal = (item: EncryptedVaultItem) => {
    setViewModalItem(item);
    setViewModalPin('');
    setShowViewModalPin(false);
    setViewModalError(null);
    setIsViewVerified(false);
    setShowViewPassword(false);
    setViewDecrypted({ username: '', password: '', notes: '' });
  };

  // Confirmar Clave Maestra y Desbloquear Visualización en Modal
  const handleConfirmMasterPinInModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewModalItem || !salt || !verifier || !verifierIv) return;
    if (!viewModalPin) {
      setViewModalError('Ingresa tu clave maestra');
      return;
    }

    try {
      setVerifyingView(true);
      setViewModalError(null);

      // Derivar llave con la clave ingresada
      const candidateKey = await deriveMasterKey(viewModalPin, salt);
      const isValid = await verifyMasterKey(candidateKey, verifier, verifierIv);

      if (!isValid) {
        setViewModalError('Clave maestra incorrecta');
        return;
      }

      // Descifrar inmediatamente en caliente con la llave verificada
      let password = '';
      let username = '';
      let notes = '';

      try {
        password = await decryptVaultData(viewModalItem.passwordEncrypted, viewModalItem.iv, candidateKey);
      } catch (err) {
        console.error('Error descifrando contraseña:', err);
      }

      if (viewModalItem.usernameEncrypted) {
        try {
          username = await decryptVaultData(viewModalItem.usernameEncrypted, viewModalItem.iv, candidateKey);
        } catch (err) {
          console.error('Error descifrando usuario:', err);
        }
      }

      if (viewModalItem.notesEncrypted) {
        try {
          notes = await decryptVaultData(viewModalItem.notesEncrypted, viewModalItem.iv, candidateKey);
        } catch (err) {
          console.error('Error descifrando notas:', err);
        }
      }

      setViewDecrypted({ username, password, notes });
      setIsViewVerified(true);
      setViewModalPin('');
      resetInactivityTimer();

      // Si por alguna razón masterKey no estaba fijada, asegurarla
      if (!masterKey) setMasterKey(candidateKey);
    } catch (err: any) {
      console.error('Error verifying master pin:', err);
      setViewModalError('Error al procesar la clave maestra');
    } finally {
      setVerifyingView(false);
    }
  };

  // Copiar al portapapeles con feedback
  const handleCopy = (text: string, identifier: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(identifier);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  // Abrir modal para crear
  const openCreateModal = () => {
    setEditingItem(null);
    setModalTitle('');
    setModalCategory('banking');
    setModalUrl('');
    setModalUsername('');
    setModalPassword('');
    setModalNotes('');
    setModalIsFavorite(false);
    setShowModalPassword(false);
    setModalError(null);
    setModalOpen(true);
  };

  // Abrir modal para editar
  const openEditModal = (item: EncryptedVaultItem) => {
    const dec = decryptedCache[item.id] || {};
    setEditingItem(item);
    setModalTitle(item.title);
    setModalCategory(item.category);
    setModalUrl(item.websiteUrl || '');
    setModalUsername(dec.username || '');
    setModalPassword(dec.password || '');
    setModalNotes(dec.notes || '');
    setModalIsFavorite(item.isFavorite);
    setShowModalPassword(false);
    setModalError(null);
    setModalOpen(true);
  };

  // Guardar elemento cifrado
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterKey) return;
    if (!modalTitle.trim() || !modalPassword) {
      setModalError('El título y la contraseña son obligatorios');
      return;
    }

    try {
      setSavingItem(true);
      setModalError(null);

      // Generar UN solo vector de inicialización (IV) compartido para todo el registro
      const recordIv = new Uint8Array(12);
      window.crypto.getRandomValues(recordIv);

      const passEnc = await encryptVaultData(modalPassword, masterKey, recordIv);
      const userEnc = modalUsername
        ? await encryptVaultData(modalUsername, masterKey, recordIv)
        : null;
      const notesEnc = modalNotes
        ? await encryptVaultData(modalNotes, masterKey, recordIv)
        : null;

      const payload = {
        id: editingItem?.id,
        title: modalTitle.trim(),
        category: modalCategory,
        websiteUrl: modalUrl.trim() || null,
        passwordEncrypted: passEnc.ciphertext,
        usernameEncrypted: userEnc ? userEnc.ciphertext : null,
        notesEncrypted: notesEnc ? notesEnc.ciphertext : null,
        iv: passEnc.iv,
        isFavorite: modalIsFavorite,
      };

      const res = await fetch('/api/vault/items', {
        method: editingItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Error al guardar la contraseña');
      }

      setModalOpen(false);
      await fetchVaultItems(masterKey);
    } catch (err: any) {
      console.error(err);
      setModalError(err.message || 'Error al cifrar y guardar el elemento');
    } finally {
      setSavingItem(false);
    }
  };

  // Eliminar elemento
  const handleDeleteItem = async (id: string, title: string) => {
    if (!confirm(`¿Eliminar la contraseña de "${title}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/vault/items?id=${id}`, { method: 'DELETE' });
      if (res.ok && masterKey) {
        await fetchVaultItems(masterKey);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Generar contraseña
  const handleGenerate = () => {
    const pwd = generateSecurePassword({
      length: genLength,
      includeUppercase: genUpper,
      includeLowercase: genLower,
      includeNumbers: genNumbers,
      includeSymbols: genSymbols,
    });
    setGeneratedResult(pwd);
  };

  const openQuickGenerator = () => {
    const pwd = generateSecurePassword({ length: 16 });
    setGeneratedResult(pwd);
    setGenModalOpen(true);
  };

  // Filtrado de elementos
  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const query = searchQuery.toLowerCase();
    const dec = decryptedCache[item.id];
    const matchesQuery =
      !searchQuery ||
      item.title.toLowerCase().includes(query) ||
      (dec?.username && dec.username.toLowerCase().includes(query)) ||
      (item.websiteUrl && item.websiteUrl.toLowerCase().includes(query));
    return matchesCategory && matchesQuery;
  });

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER: PANTALLA DE CARGA
  // ═══════════════════════════════════════════════════════════════
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-3 border-brand-500 border-t-transparent mb-4"></div>
        <p className="text-sm font-medium text-text-secondary">Verificando bóveda segura...</p>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER: CONFIGURACIÓN INICIAL (MODAL PRIMERA VEZ)
  // ═══════════════════════════════════════════════════════════════
  if (!hasVault) {
    return (
      <div className="relative min-h-[70vh]">
        {/* Fondo sutil de la bóveda mientras se configura */}
        <div className="pointer-events-none select-none opacity-30 blur-xs space-y-6">
          <div className="h-16 rounded-2xl border border-border-default bg-surface-50"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-44 rounded-2xl border border-border-default bg-surface-50"></div>
            ))}
          </div>
        </div>

        {/* MODAL: ACTIVAR BÓVEDA */}
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl border border-border-default bg-surface-50 p-6 sm:p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto animate-scale-in">
            {/* Botón Cerrar / Volver */}
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 1) {
                  window.history.back();
                } else {
                  window.location.href = '/app/dashboard';
                }
              }}
              className="absolute right-4 top-4 rounded-xl p-2 text-text-muted hover:text-text-primary hover:bg-surface-100 transition-colors cursor-pointer"
              title="Cerrar y volver"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/15 border border-brand-500/30 text-brand-400 shadow-inner shrink-0">
                {SvgIcons.lock}
              </div>
              <div className="min-w-0 pr-6">
                <h2 className="text-xl sm:text-2xl font-bold text-text-primary">
                  Configura tu Bóveda Segura
                </h2>
                <p className="text-xs sm:text-sm text-text-muted mt-0.5">
                  Cifrado de Cero Conocimiento (*Zero-Knowledge AES-256*)
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-warning-500/30 bg-warning-500/10 p-4 text-xs text-warning-400 space-y-1.5 leading-relaxed">
              <div className="font-bold flex items-center gap-1.5 text-sm">
                <span className="h-4 w-4">{SvgIcons.other}</span>
                Importante sobre tu Clave Maestra
              </div>
              <p>
                Tus contraseñas se cifran en tu dispositivo antes de viajar a la base de datos.
                <strong> Nadie más puede ver tus contraseñas, ni siquiera el equipo de ProyecAhorro.</strong>
              </p>
              <p>
                Si olvidas esta clave maestra, no podrá ser recuperada por ningún administrador. Guarda bien tu clave o escribe una pista.
              </p>
            </div>

            <form onSubmit={handleSetup} className="space-y-4">
              {setupError && (
                <div className="rounded-xl border border-danger-500/30 bg-danger-500/10 p-3 text-xs font-semibold text-danger-400">
                  {setupError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1.5">
                  Crea tu PIN o Contraseña Maestra
                </label>
                <div className="relative">
                  <input
                    type={showNewPin ? 'text' : 'password'}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="Mínimo 6 caracteres (ej. PIN o frase secreta)"
                    className="w-full rounded-xl border border-border-default bg-surface-100 px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-500 focus:outline-none pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPin(!showNewPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary text-xs"
                  >
                    {showNewPin ? SvgIcons.eyeOff : SvgIcons.eye}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1.5">
                  Confirma tu Contraseña Maestra
                </label>
                <input
                  type={showNewPin ? 'text' : 'password'}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  placeholder="Repite exactamente la misma clave"
                  className="w-full rounded-xl border border-border-default bg-surface-100 px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1.5">
                  Pista para recordar tu clave (Opcional)
                </label>
                <input
                  type="text"
                  value={newHint}
                  onChange={(e) => setNewHint(e.target.value)}
                  placeholder="Ej. Mi fecha favorita + inicial de mi mascota"
                  className="w-full rounded-xl border border-border-default bg-surface-100 px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-500 focus:outline-none"
                  maxLength={200}
                />
                <span className="text-[11px] text-text-muted mt-1 block">
                  Esta pista será visible si olvidas tu clave, pero no revela la contraseña.
                </span>
              </div>

              <button
                type="submit"
                disabled={settingUp}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 text-sm font-bold text-white shadow-lg hover:bg-brand-400 transition-all cursor-pointer disabled:opacity-50"
              >
                <span className="h-4 w-4">{SvgIcons.lock}</span>
                <span>{settingUp ? 'Generando llaves seguras...' : 'Activar Bóveda Segura'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER: PANTALLA DE DESBLOQUEO (MODAL BÓVEDA PROTEGIDA)
  // ═══════════════════════════════════════════════════════════════
  if (!isUnlocked) {
    return (
      <div className="relative min-h-[70vh]">
        {/* Fondo sutil de la bóveda bajo el modal */}
        <div className="pointer-events-none select-none opacity-30 blur-xs space-y-6">
          <div className="h-16 rounded-2xl border border-border-default bg-surface-50"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-44 rounded-2xl border border-border-default bg-surface-50"></div>
            ))}
          </div>
        </div>

        {/* MODAL: BÓVEDA PROTEGIDA */}
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl border border-border-default bg-surface-50 p-6 sm:p-8 shadow-2xl text-center space-y-6 animate-scale-in">
            {/* Botón Cerrar / Volver */}
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 1) {
                  window.history.back();
                } else {
                  window.location.href = '/app/dashboard';
                }
              }}
              className="absolute right-4 top-4 rounded-xl p-2 text-text-muted hover:text-text-primary hover:bg-surface-100 transition-colors cursor-pointer"
              title="Cerrar y volver"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-500/15 border border-brand-500/30 text-brand-400 shadow-inner">
              <span className="h-9 w-9 flex items-center justify-center">{SvgIcons.lock}</span>
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-text-primary">
                Bóveda Protegida
              </h2>
              <p className="text-xs sm:text-sm text-text-muted mt-1">
                Ingresa tu Clave Maestra. Por seguridad, tras 3 intentos fallidos toda la información será borrada permanentemente.
              </p>
            </div>

            {vaultWiped ? (
              <div className="rounded-2xl border border-danger-500/50 bg-danger-500/15 p-4 text-xs font-semibold text-danger-300 space-y-2 text-left">
                <div className="flex items-center gap-2 text-danger-400 font-bold text-sm">
                  <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Bóveda Eliminada por Seguridad
                </div>
                <p className="text-text-secondary leading-relaxed">
                  Has superado el límite de 3 intentos fallidos consecutivos. Por protección de tus datos confidenciales, la bóveda y todas las contraseñas han sido borradas permanentemente.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setVaultWiped(false);
                    setHasVault(false);
                    setUnlockError(null);
                  }}
                  className="mt-2 w-full rounded-xl bg-danger-500 text-white font-bold py-2.5 text-xs hover:bg-danger-400 transition-colors cursor-pointer"
                >
                  Configurar nueva bóveda desde cero
                </button>
              </div>
            ) : (
              unlockError && (
                <div className="rounded-xl border border-danger-500/30 bg-danger-500/10 p-3 text-xs font-semibold text-danger-400 text-left">
                  {unlockError}
                  {attemptsLeft !== null && attemptsLeft > 0 && attemptsLeft < 3 && (
                    <div className="mt-1.5 text-[11px] font-bold text-warning-400 flex items-center gap-1.5">
                      <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>Intentos restantes: {attemptsLeft} de 3 antes del borrado total</span>
                    </div>
                  )}
                </div>
              )
            )}

            <form onSubmit={handleUnlock} className="space-y-4 text-left">
              <div className="relative">
                <input
                  type={showUnlockPin ? 'text' : 'password'}
                  value={unlockPin}
                  onChange={(e) => setUnlockPin(e.target.value)}
                  placeholder="Ingresa tu Clave Maestra..."
                  autoFocus
                  className="w-full rounded-2xl border border-border-default bg-surface-100 px-4 py-3.5 text-base text-center text-text-primary placeholder:text-text-muted focus:border-brand-500 focus:outline-none tracking-widest"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowUnlockPin(!showUnlockPin)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary text-xs p-1 cursor-pointer"
                  title={showUnlockPin ? 'Ocultar' : 'Ver'}
                >
                  {showUnlockPin ? SvgIcons.eyeOff : SvgIcons.eye}
                </button>
              </div>

              <button
                type="submit"
                disabled={unlocking}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-500 py-3.5 text-sm font-bold text-white shadow-lg hover:bg-brand-400 transition-all cursor-pointer disabled:opacity-50"
              >
                <span className="h-4 w-4">{SvgIcons.unlock}</span>
                <span>{unlocking ? 'Descifrando datos...' : 'Desbloquear Bóveda'}</span>
              </button>
            </form>

            {hint && (
              <div className="pt-2 border-t border-border-default/60">
                <button
                  type="button"
                  onClick={() => setShowHintModal(!showHintModal)}
                  className="text-xs font-semibold text-brand-400 hover:underline cursor-pointer"
                >
                  {showHintModal ? 'Ocultar pista' : '¿Olvidaste tu clave? Ver pista'}
                </button>
                {showHintModal && (
                  <div className="mt-2 flex items-center gap-1.5 rounded-xl bg-surface-100 p-3 text-xs text-text-secondary border border-border-default text-left">
                    <svg className="h-4 w-4 text-warning-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <span><strong>Pista registrada:</strong> {hint}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER: BÓVEDA DESBLOQUEADA (GESTIÓN DE CONTRASEÑAS)
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6">
      {/* Barra Superior de Estado y Auto-Bloqueo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-border-default bg-surface-50 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-500/15 text-accent-400 border border-accent-500/30">
            {SvgIcons.unlock}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-text-primary">
                Bóveda Desbloqueada
              </h2>
              <span className="inline-flex items-center gap-1 rounded-md bg-accent-500/15 border border-accent-500/30 px-2 py-0.5 text-[10px] font-bold text-accent-400">
                {SvgIcons.shieldCheck}
                AES-256 Activo
              </span>
            </div>
            <p className="text-xs text-text-muted">
              {items.length} {items.length === 1 ? 'cuenta protegida' : 'cuentas protegidas'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {/* Indicador de Auto-bloqueo por inactividad */}
          <div
            className="flex items-center gap-1.5 rounded-xl border border-border-default bg-surface-100 px-3 py-1.5 text-xs text-text-secondary"
            title="Se bloqueará automáticamente por inactividad prolongada"
          >
            <span className="h-2 w-2 rounded-full bg-accent-400 animate-pulse" />
            <span className="font-mono text-[11px] font-semibold">
              Auto-lock: {formatTimer(secondsRemaining)}
            </span>
          </div>

          {/* Generador Rápido */}
          <button
            type="button"
            onClick={openQuickGenerator}
            className="inline-flex items-center gap-1.5 rounded-xl border border-brand-500/30 bg-brand-500/10 px-3 py-1.5 text-xs font-semibold text-brand-400 hover:bg-brand-500/20 transition-all cursor-pointer"
          >
            {SvgIcons.sparkles}
            <span className="hidden sm:inline">Generar Clave</span>
          </button>

          {/* Botón Bloquear */}
          <button
            type="button"
            onClick={lockVault}
            className="inline-flex items-center gap-1.5 rounded-xl border border-danger-500/30 bg-danger-500/10 px-3 py-1.5 text-xs font-semibold text-danger-400 hover:bg-danger-500/20 transition-all cursor-pointer"
            title="Bloquear la bóveda y borrar clave de la memoria"
          >
            {SvgIcons.lock}
            <span>Bloquear</span>
          </button>
        </div>
      </div>

      {/* Controles: Búsqueda, Categorías y Nueva Contraseña */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2">
          {/* Barra de Búsqueda */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar banco, correo, usuario..."
              className="w-full rounded-xl border border-border-default bg-surface-50 px-3.5 py-2 pl-9 text-xs sm:text-sm text-text-primary placeholder:text-text-muted focus:border-brand-500 focus:outline-none"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-xs">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary p-1 cursor-pointer"
                title="Limpiar búsqueda"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Botón Importar CSV */}
          <button
            type="button"
            onClick={() => {
              setImportModalOpen(true);
              setImportError(null);
              setImportSuccess(null);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-accent-500/30 bg-accent-500/10 px-4 py-2.5 text-xs sm:text-sm font-bold text-accent-400 shadow-sm hover:bg-accent-500/20 transition-all cursor-pointer"
            title="Importar contraseñas desde CSV (Google Passwords, etc.)"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>Importar CSV</span>
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-brand-400 transition-all cursor-pointer"
          >
            <span className="text-base font-bold">+</span>
            <span>Nueva Contraseña</span>
          </button>
        </div>
      </div>

      {/* Selector de Categorías Horizontal */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              selectedCategory === cat.id
                ? 'bg-brand-500 text-white shadow-sm'
                : 'border border-border-default bg-surface-50 text-text-secondary hover:text-text-primary hover:bg-surface-100'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Grid de Contraseñas */}
      {loadingItems ? (
        <div className="py-12 text-center text-xs text-text-muted">
          Descifrando elementos seguros...
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-default p-8 text-center space-y-3 bg-surface-50/50">
          <div className="flex justify-center text-text-muted">
            <span className="h-10 w-10">{SvgIcons.all}</span>
          </div>
          <h3 className="text-sm font-bold text-text-primary">
            {searchQuery ? 'No se encontraron resultados' : 'Tu bóveda está vacía'}
          </h3>
          <p className="text-xs text-text-muted max-w-sm mx-auto">
            {searchQuery
              ? 'Intenta con otro término o borra la búsqueda.'
              : 'Agrega tus cuentas bancarias, correos, plataformas de streaming y notas seguras para tenerlas siempre protegidas.'}
          </p>
          {!searchQuery && (
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2 text-xs font-bold text-white hover:bg-brand-400 cursor-pointer"
            >
              + Agregar Primera Contraseña
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredItems.map((item) => {
            const catObj = CATEGORIES.find((c) => c.id === item.category) || CATEGORIES[CATEGORIES.length - 1];

            return (
              <div
                key={item.id}
                className="group flex flex-col justify-between rounded-2xl border border-border-default/80 bg-surface-50 p-4 shadow-sm hover:border-brand-500/40 hover:shadow-md transition-all gap-3"
              >
                {/* Cabecera de la Tarjeta */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-100 border border-border-default text-text-primary shadow-2xs">
                        {catObj.icon}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-text-primary truncate" title={item.title}>
                          {item.title}
                        </h4>
                        <span className="text-[10px] text-text-muted block truncate">
                          {catObj.label}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {item.websiteUrl && (
                        <a
                          href={item.websiteUrl.startsWith('http') ? item.websiteUrl : `https://${item.websiteUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg p-1.5 text-text-muted hover:text-brand-400 hover:bg-surface-100 transition-colors"
                          title="Abrir sitio web"
                        >
                          {SvgIcons.globe}
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="rounded-lg p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-100 transition-colors cursor-pointer"
                        title="Editar"
                      >
                        {SvgIcons.edit}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id, item.title)}
                        className="rounded-lg p-1.5 text-text-muted hover:text-danger-400 hover:bg-danger-500/10 transition-colors cursor-pointer"
                        title="Eliminar"
                      >
                        {SvgIcons.trash}
                      </button>
                    </div>
                  </div>

                  {/* Estado Protegido y Botón Ver en Modal */}
                  <div className="rounded-xl bg-surface-100/60 p-3 border border-border-default/60 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[10px] uppercase font-semibold text-text-muted tracking-wider">
                        Credenciales
                      </span>
                      <span className="text-[11px] font-mono text-text-muted tracking-widest">
                        ••••••••••••
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => openViewCredentialsModal(item)}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-500/15 border border-brand-500/30 px-3 py-2 text-xs font-bold text-brand-400 hover:bg-brand-500/25 transition-all cursor-pointer shadow-2xs"
                    >
                      {SvgIcons.eye}
                      <span>Ver usuario y contraseña</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL: VER CREDENCIALES (DESAFÍO Y VISUALIZACIÓN)
      ═══════════════════════════════════════════════════════════════ */}
      {viewModalItem && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl border border-border-default bg-surface-50 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Cabecera */}
            <div className="flex items-center justify-between border-b border-border-default pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400 border border-brand-500/30">
                  {isViewVerified ? SvgIcons.unlock : SvgIcons.lock}
                </div>
                <div>
                  <h3 className="font-bold text-base text-text-primary truncate max-w-[240px]">
                    {viewModalItem.title}
                  </h3>
                  <span className="text-[10px] text-text-muted block">
                    {isViewVerified ? 'Credenciales Descifradas' : 'Confirmar Clave Maestra'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewModalItem(null)}
                className="rounded-lg p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-100 transition-colors cursor-pointer"
                title="Cerrar modal"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* FASE 1: DESAFÍO DE CLAVE MAESTRA */}
            {!isViewVerified ? (
              <div className="space-y-4">
                <p className="text-xs text-text-secondary leading-relaxed">
                  Para visualizar y copiar el usuario y la contraseña de <strong>{viewModalItem.title}</strong>,
                  ingresa tu <strong>Clave Maestra o PIN de la Bóveda</strong>.
                </p>

                {viewModalError && (
                  <div className="rounded-xl border border-danger-500/30 bg-danger-500/10 p-3 text-xs font-semibold text-danger-400">
                    {viewModalError}
                  </div>
                )}

                <form onSubmit={handleConfirmMasterPinInModal} className="space-y-4">
                  <div className="relative">
                    <input
                      type={showViewModalPin ? 'text' : 'password'}
                      value={viewModalPin}
                      onChange={(e) => setViewModalPin(e.target.value)}
                      placeholder="Ingresa tu Clave Maestra..."
                      autoFocus
                      className="w-full rounded-xl border border-border-default bg-surface-100 px-3.5 py-3 text-sm text-text-primary placeholder:text-text-muted focus:border-brand-500 focus:outline-none pr-10 tracking-widest text-center"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowViewModalPin(!showViewModalPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary text-xs"
                    >
                      {showViewModalPin ? SvgIcons.eyeOff : SvgIcons.eye}
                    </button>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setViewModalItem(null)}
                      className="rounded-xl border border-border-default px-4 py-2.5 text-xs font-semibold text-text-secondary hover:text-text-primary cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={verifyingView}
                      className="rounded-xl bg-brand-500 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-brand-400 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {verifyingView ? 'Descifrando...' : 'Desbloquear y Ver'}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* FASE 2: VISUALIZACIÓN REVELADA CON COPIADO EN 1 CLIC */
              <div className="space-y-4 animate-fade-in">
                {/* Enlace al sitio si existe */}
                {viewModalItem.websiteUrl && (
                  <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-surface-100 border border-border-default">
                    <span className="text-text-muted">Sitio web:</span>
                    <a
                      href={viewModalItem.websiteUrl.startsWith('http') ? viewModalItem.websiteUrl : `https://${viewModalItem.websiteUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-brand-400 hover:underline"
                    >
                      <span>{viewModalItem.websiteUrl}</span>
                      {SvgIcons.globe}
                    </a>
                  </div>
                )}

                {/* Campo: Usuario / Correo */}
                <div className="rounded-2xl border border-border-default bg-surface-100 p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                      Usuario o Correo Electrónico
                    </span>
                    {viewDecrypted.username && (
                      <button
                        type="button"
                        onClick={() => handleCopy(viewDecrypted.username, 'modal-user')}
                        className="inline-flex items-center gap-1 text-xs font-bold text-brand-400 hover:text-brand-300 cursor-pointer"
                      >
                        {copiedKey === 'modal-user' ? (
                          <>
                            {SvgIcons.check}
                            <span className="text-accent-400">✓ Copiado</span>
                          </>
                        ) : (
                          <>
                            {SvgIcons.copy}
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <div className="font-mono text-sm font-semibold text-text-primary select-all break-all">
                    {viewDecrypted.username || '(Sin usuario registrado)'}
                  </div>
                </div>

                {/* Campo: Contraseña */}
                <div className="rounded-2xl border border-border-default bg-surface-100 p-3.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                      Contraseña
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowViewPassword(!showViewPassword)}
                        className="text-text-muted hover:text-text-primary p-1 cursor-pointer"
                        title={showViewPassword ? 'Ocultar' : 'Mostrar'}
                      >
                        {showViewPassword ? SvgIcons.eyeOff : SvgIcons.eye}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy(viewDecrypted.password, 'modal-pass')}
                        className="inline-flex items-center gap-1 text-xs font-bold text-brand-400 hover:text-brand-300 cursor-pointer"
                      >
                        {copiedKey === 'modal-pass' ? (
                          <>
                            {SvgIcons.check}
                            <span className="text-accent-400">✓ Copiada</span>
                          </>
                        ) : (
                          <>
                            {SvgIcons.copy}
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="font-mono text-base font-bold text-text-primary select-all break-all tracking-wider">
                    {showViewPassword ? viewDecrypted.password : '••••••••••••••••'}
                  </div>
                </div>

                {/* Campo: Notas Privadas */}
                {viewDecrypted.notes && (
                  <div className="rounded-2xl border border-border-default bg-surface-100 p-3.5 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                        Notas Seguras / PINs
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(viewDecrypted.notes, 'modal-notes')}
                        className="inline-flex items-center gap-1 text-xs font-bold text-brand-400 hover:text-brand-300 cursor-pointer"
                      >
                        {copiedKey === 'modal-notes' ? (
                          <>
                            {SvgIcons.check}
                            <span className="text-accent-400">✓ Copiado</span>
                          </>
                        ) : (
                          <>
                            {SvgIcons.copy}
                            <span>Copiar</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="font-mono text-xs text-text-secondary whitespace-pre-wrap select-all">
                      {viewDecrypted.notes}
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setViewModalItem(null)}
                    className="w-full rounded-xl bg-surface-200 hover:bg-surface-300 py-2.5 text-xs font-bold text-text-primary transition-all cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL: CREAR O EDITAR CONTRASEÑA
      ═══════════════════════════════════════════════════════════════ */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl border border-border-default bg-surface-50 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border-default pb-3">
              <h3 className="font-bold text-base sm:text-lg text-text-primary">
                {editingItem ? 'Editar Contraseña' : 'Nueva Contraseña Segura'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-100 transition-colors cursor-pointer"
                title="Cerrar modal"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {modalError && (
              <div className="rounded-xl border border-danger-500/30 bg-danger-500/10 p-3 text-xs font-semibold text-danger-400">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSaveItem} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  Nombre o Servicio *
                </label>
                <input
                  type="text"
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  placeholder="Ej. Banco Pichincha, Netflix, Correo Trabajo"
                  className="w-full rounded-xl border border-border-default bg-surface-100 px-3.5 py-2 text-xs sm:text-sm text-text-primary placeholder:text-text-muted focus:border-brand-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">
                    Categoría
                  </label>
                  <select
                    value={modalCategory}
                    onChange={(e) => setModalCategory(e.target.value)}
                    className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs sm:text-sm text-text-primary focus:border-brand-500 focus:outline-none"
                  >
                    {CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">
                    Sitio Web (Opcional)
                  </label>
                  <input
                    type="text"
                    value={modalUrl}
                    onChange={(e) => setModalUrl(e.target.value)}
                    placeholder="ej. bancoweb.com"
                    className="w-full rounded-xl border border-border-default bg-surface-100 px-3.5 py-2 text-xs sm:text-sm text-text-primary placeholder:text-text-muted focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  Usuario o Correo Electrónico
                </label>
                <input
                  type="text"
                  value={modalUsername}
                  onChange={(e) => setModalUsername(e.target.value)}
                  placeholder="usuario123 o tu-correo@ejemplo.com"
                  className="w-full rounded-xl border border-border-default bg-surface-100 px-3.5 py-2 text-xs sm:text-sm text-text-primary placeholder:text-text-muted focus:border-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-text-primary">
                    Contraseña *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const pwd = generateSecurePassword({ length: 16 });
                      setModalPassword(pwd);
                      setShowModalPassword(true);
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-400 hover:underline cursor-pointer"
                  >
                    {SvgIcons.sparkles}
                    <span>Generar Segura</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showModalPassword ? 'text' : 'password'}
                    value={modalPassword}
                    onChange={(e) => setModalPassword(e.target.value)}
                    placeholder="Tu clave secreta..."
                    className="w-full rounded-xl border border-border-default bg-surface-100 px-3.5 py-2 pr-16 text-xs sm:text-sm text-text-primary font-mono placeholder:font-sans placeholder:text-text-muted focus:border-brand-500 focus:outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowModalPassword(!showModalPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-text-muted hover:text-text-primary p-1 cursor-pointer"
                  >
                    {showModalPassword ? SvgIcons.eyeOff : SvgIcons.eye}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  Notas Privadas / Códigos de Recuperación
                </label>
                <textarea
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="PINs de cajero, respuestas de seguridad, códigos 2FA..."
                  rows={3}
                  className="w-full rounded-xl border border-border-default bg-surface-100 px-3.5 py-2 text-xs sm:text-sm text-text-primary placeholder:text-text-muted focus:border-brand-500 focus:outline-none resize-none font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-default">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-border-default px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingItem}
                  className="rounded-xl bg-brand-500 px-5 py-2 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-brand-400 transition-all cursor-pointer disabled:opacity-50"
                >
                  {savingItem ? 'Cifrando...' : 'Cifrar y Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL: GENERADOR AVANZADO DE CONTRASEÑAS
      ═══════════════════════════════════════════════════════════════ */}
      {genModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl border border-border-default bg-surface-50 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border-default pb-3">
              <div className="flex items-center gap-2">
                <span className="text-brand-400">{SvgIcons.sparkles}</span>
                <h3 className="font-bold text-base text-text-primary">
                  Generador de Contraseñas Seguras
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setGenModalOpen(false)}
                className="rounded-lg p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-100 transition-colors cursor-pointer"
                title="Cerrar generador"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Resultado generado */}
            <div className="relative rounded-2xl bg-surface-100 border border-brand-500/30 p-3.5 text-center">
              <span className="font-mono text-sm sm:text-base font-bold text-text-primary break-all tracking-wider select-all">
                {generatedResult || 'Generando...'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGenerate}
                className="flex-1 rounded-xl border border-border-default bg-surface-100 py-2.5 text-xs font-semibold text-text-primary hover:bg-surface-200 transition-all cursor-pointer"
              >
                Otra combinación
              </button>
              <button
                type="button"
                onClick={() => handleCopy(generatedResult, 'gen-modal')}
                className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-500 py-2.5 text-xs font-bold text-white hover:bg-brand-400 transition-all cursor-pointer shadow-sm"
              >
                {copiedKey === 'gen-modal' ? (
                  <>
                    {SvgIcons.check}
                    <span>Copiada</span>
                  </>
                ) : (
                  <>
                    {SvgIcons.copy}
                    <span>Copiar Clave</span>
                  </>
                )}
              </button>
            </div>

            {/* Controles de Configuración */}
            <div className="space-y-3 pt-2 border-t border-border-default text-xs text-text-secondary">
              <div>
                <div className="flex items-center justify-between font-medium mb-1">
                  <span>Longitud: {genLength} caracteres</span>
                  <span className="text-[10px] text-accent-400 font-bold">
                    {genLength >= 16 ? 'Excelente' : genLength >= 12 ? 'Fuerte' : 'Media'}
                  </span>
                </div>
                <input
                  type="range"
                  min={8}
                  max={36}
                  value={genLength}
                  onChange={(e) => {
                    setGenLength(Number(e.target.value));
                    setTimeout(handleGenerate, 50);
                  }}
                  className="w-full accent-brand-500 cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={genUpper}
                    onChange={(e) => {
                      setGenUpper(e.target.checked);
                      setTimeout(handleGenerate, 50);
                    }}
                    className="rounded text-brand-500"
                  />
                  <span>Mayúsculas (A-Z)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={genLower}
                    onChange={(e) => {
                      setGenLower(e.target.checked);
                      setTimeout(handleGenerate, 50);
                    }}
                    className="rounded text-brand-500"
                  />
                  <span>Minúsculas (a-z)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={genNumbers}
                    onChange={(e) => {
                      setGenNumbers(e.target.checked);
                      setTimeout(handleGenerate, 50);
                    }}
                    className="rounded text-brand-500"
                  />
                  <span>Números (0-9)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={genSymbols}
                    onChange={(e) => {
                      setGenSymbols(e.target.checked);
                      setTimeout(handleGenerate, 50);
                    }}
                    className="rounded text-brand-500"
                  />
                  <span>Símbolos (!@#$)</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ═══════════════════════════════════════════════════════════════
          MODAL: IMPORTAR CONTRASEÑAS DESDE CSV (GOOGLE PASSWORDS)
      ═══════════════════════════════════════════════════════════════ */}
      {importModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl border border-border-default bg-surface-50 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border-default pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-500/15 text-accent-400">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </span>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-text-primary">
                    Importar Contraseñas a la Bóveda
                  </h3>
                  <p className="text-xs text-text-muted">
                    Compatible con Google Chrome (Google Passwords.csv)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="rounded-lg p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-100 transition-colors cursor-pointer"
                title="Cerrar modal"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {importError && (
              <div className="rounded-xl border border-danger-500/30 bg-danger-500/10 p-3 text-xs font-semibold text-danger-400">
                {importError}
              </div>
            )}

            {importSuccess && (
              <div className="rounded-xl border border-accent-500/30 bg-accent-500/10 p-3 text-xs font-semibold text-accent-400 flex items-center gap-2">
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                <span>{importSuccess}</span>
              </div>
            )}

            {/* Selector de Archivo CSV */}
            <div className="rounded-2xl border-2 border-dashed border-border-default hover:border-accent-400/50 bg-surface-100/50 p-6 text-center transition-colors">
              <input
                type="file"
                id="csvFileInput"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <label
                htmlFor="csvFileInput"
                className="cursor-pointer flex flex-col items-center justify-center space-y-2"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-500/10 text-accent-400">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div className="text-sm font-bold text-text-primary">
                  {csvFileName ? (
                    <span className="text-accent-400">Archivo: {csvFileName}</span>
                  ) : (
                    <span>Haz clic para seleccionar tu archivo CSV</span>
                  )}
                </div>
                <p className="text-xs text-text-muted max-w-sm">
                  Selecciona tu archivo <strong>Google Passwords.csv</strong> descargado de Chrome o exportado de tu navegador.
                </p>
              </label>
            </div>

            {/* Alternativa: Pegar contenido CSV */}
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                O pega el texto CSV directamente:
              </label>
              <textarea
                value={csvPasteText}
                onChange={(e) => {
                  const val = e.target.value;
                  setCsvPasteText(val);
                  if (val.trim()) {
                    try {
                      const items = parseGooglePasswordsCsv(val);
                      setParsedCsvItems(items);
                      setImportError(null);
                    } catch (err: any) {
                      setImportError(err.message);
                    }
                  } else {
                    setParsedCsvItems([]);
                  }
                }}
                placeholder="name,url,username,password,note..."
                rows={3}
                className="w-full rounded-xl border border-border-default bg-surface-100 px-3 py-2 text-xs font-mono text-text-primary placeholder:text-text-muted focus:border-brand-500 focus:outline-none resize-none"
              />
            </div>

            {/* Vista Previa de Contraseñas Detectadas */}
            {parsedCsvItems.length > 0 && (
              <div className="space-y-2 rounded-2xl border border-border-default bg-surface-100 p-3.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-text-primary flex items-center gap-1.5">
                    <svg className="h-4 w-4 text-brand-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <circle cx="11" cy="11" r="8" strokeWidth="1.8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                    <span>Cuentas encontradas: <strong className="text-accent-400">{parsedCsvItems.length}</strong></span>
                  </span>
                  <span className="text-text-muted text-[11px]">
                    Se cifrarán con AES-256 antes de guardarse
                  </span>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {parsedCsvItems.slice(0, 50).map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg bg-surface-50 border border-border-default px-2.5 py-1.5 text-xs"
                    >
                      <div className="min-w-0 truncate">
                        <span className="font-bold text-text-primary block truncate">{item.title}</span>
                        <span className="text-[10px] text-text-muted truncate block">
                          {item.username || 'Sin usuario'} • {item.url || 'Sin URL'}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-text-muted ml-2 shrink-0">
                        ••••••••
                      </span>
                    </div>
                  ))}
                  {parsedCsvItems.length > 50 && (
                    <div className="text-center text-[11px] text-text-muted py-1">
                      ... y {parsedCsvItems.length - 50} cuentas más
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Acciones */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border-default">
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                className="rounded-xl border border-border-default px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleProcessImport}
                disabled={importing || parsedCsvItems.length === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-accent-500 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-accent-400 transition-all cursor-pointer disabled:opacity-40"
              >
                {importing ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Cifrando y Guardando...</span>
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Cifrar e Importar {parsedCsvItems.length > 0 ? `(${parsedCsvItems.length})` : ''}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
