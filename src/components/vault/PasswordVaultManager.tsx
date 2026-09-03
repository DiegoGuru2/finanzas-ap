import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  generateSalt,
  deriveMasterKey,
  createCanaryVerifier,
  verifyMasterKey,
  encryptVaultData,
  decryptVaultData,
  generateSecurePassword,
  type PasswordGeneratorOptions,
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

const CATEGORIES = [
  { id: 'all', label: 'Todos', icon: '🔑' },
  { id: 'banking', label: 'Bancos y Finanzas', icon: '🏦' },
  { id: 'cards', label: 'Tarjetas', icon: '💳' },
  { id: 'email', label: 'Correos', icon: '📧' },
  { id: 'streaming', label: 'Suscripciones / Streaming', icon: '🎬' },
  { id: 'social', label: 'Redes y Cuentas', icon: '🌐' },
  { id: 'notes', label: 'Notas Seguras / PINs', icon: '📝' },
  { id: 'other', label: 'Otros', icon: '🔒' },
];

const AUTO_LOCK_SECONDS = 300; // 5 minutos de inactividad

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

  // Formulario de Desbloqueo
  const [unlockPin, setUnlockPin] = useState('');
  const [showUnlockPin, setShowUnlockPin] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [showHintModal, setShowHintModal] = useState(false);

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
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [loadingItems, setLoadingItems] = useState(false);

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

  // Temporizador de Auto-bloqueo
  const [secondsRemaining, setSecondsRemaining] = useState(AUTO_LOCK_SECONDS);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Cargar estado de la bóveda (si el usuario ya creó su PIN)
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

  // Función de Bloqueo Inmediato
  const lockVault = useCallback(() => {
    setMasterKey(null);
    setIsUnlocked(false);
    setDecryptedCache({});
    setRevealedPasswords({});
    setUnlockPin('');
    setUnlockError(null);
    setModalOpen(false);
    setGenModalOpen(false);
  }, []);

  // Control de Inactividad y Auto-bloqueo
  const resetInactivityTimer = useCallback(() => {
    setSecondsRemaining(AUTO_LOCK_SECONDS);
  }, []);

  useEffect(() => {
    if (!isUnlocked) return;

    const handleActivity = () => resetInactivityTimer();
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
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
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isUnlocked, lockVault, resetInactivityTimer]);

  // Bloqueo cuando la pestaña pasa a segundo plano
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isUnlocked) {
        // Al ocultar la pestaña, se bloquea por seguridad
        lockVault();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isUnlocked, lockVault]);

  // Cargar elementos cifrados de la bóveda
  const fetchVaultItems = async (keyToUse: CryptoKey) => {
    try {
      setLoadingItems(true);
      const res = await fetch('/api/vault/items');
      const json = await res.json();
      if (res.ok && Array.isArray(json.items)) {
        setItems(json.items);
        // Descifrar elementos en segundo plano en memoria
        const newCache: Record<string, DecryptedItemData> = {};
        for (const item of json.items) {
          try {
            const password = await decryptVaultData(item.passwordEncrypted, item.iv, keyToUse);
            const username = item.usernameEncrypted
              ? await decryptVaultData(item.usernameEncrypted, item.iv, keyToUse)
              : '';
            const notes = item.notesEncrypted
              ? await decryptVaultData(item.notesEncrypted, item.iv, keyToUse)
              : '';
            newCache[item.id] = { password, username, notes };
          } catch (err) {
            console.error('Error decrypting item:', item.id, err);
          }
        }
        setDecryptedCache(newCache);
      }
    } catch (e) {
      console.error('Error fetching vault items:', e);
    } finally {
      setLoadingItems(false);
    }
  };

  // 2. Desbloquear Bóveda
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

      // Derivar la llave candidata
      const candidateKey = await deriveMasterKey(unlockPin, salt);
      // Validar contra el canario
      const isValid = await verifyMasterKey(candidateKey, verifier, verifierIv);

      if (!isValid) {
        setUnlockError('PIN o contraseña maestra incorrecta');
        setUnlocking(false);
        return;
      }

      // PIN correcto: guardar llave en memoria e ingresar
      setMasterKey(candidateKey);
      setIsUnlocked(true);
      setUnlockPin('');
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
      // Generar sal aleatoria
      const newSalt = generateSalt();
      // Derivar llave simétrica AES-GCM
      const derived = await deriveMasterKey(newPin, newSalt);
      // Crear verificador canario
      const { verifier: newVerifier, verifierIv: newVerifierIv } = await createCanaryVerifier(derived);

      // Guardar en backend
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

      // Cifrar los campos sensibles con la clave maestra
      const passEnc = await encryptVaultData(modalPassword, masterKey);
      const userEnc = modalUsername
        ? await encryptVaultData(modalUsername, masterKey)
        : null;
      const notesEnc = modalNotes
        ? await encryptVaultData(modalNotes, masterKey)
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
  // RENDER: CONFIGURACIÓN INICIAL (PRIMERA VEZ)
  // ═══════════════════════════════════════════════════════════════
  if (!hasVault) {
    return (
      <div className="max-w-xl mx-auto py-8 px-4">
        <div className="rounded-3xl border border-brand-500/30 bg-surface-50 p-6 sm:p-8 shadow-2xl space-y-6 animate-fade-up">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/15 border border-brand-500/30 text-3xl shadow-inner">
              🔐
            </div>
            <div>
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
              <span>⚠️</span> Importante sobre tu Clave Maestra
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
                  {showNewPin ? 'Ocultar' : 'Ver'}
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
              className="w-full rounded-xl bg-brand-500 py-3 text-sm font-bold text-white shadow-lg hover:bg-brand-400 transition-all cursor-pointer disabled:opacity-50"
            >
              {settingUp ? 'Generando llaves seguras...' : '🔒 Activar Bóveda Segura'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER: PANTALLA DE DESBLOQUEO (BÓVEDA BLOQUEADA)
  // ═══════════════════════════════════════════════════════════════
  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto py-12 px-4">
        <div className="rounded-3xl border border-border-default bg-surface-50 p-6 sm:p-8 shadow-2xl text-center space-y-6 animate-fade-up">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-500/15 border border-brand-500/30 text-4xl shadow-inner">
            🔒
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-text-primary">
              Bóveda Protegida
            </h2>
            <p className="text-xs sm:text-sm text-text-muted mt-1">
              Ingresa tu PIN o Contraseña Maestra para descifrar tus accesos.
            </p>
          </div>

          {unlockError && (
            <div className="rounded-xl border border-danger-500/30 bg-danger-500/10 p-3 text-xs font-semibold text-danger-400">
              {unlockError}
            </div>
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
                {showUnlockPin ? '👁️‍🗨️' : '👁️'}
              </button>
            </div>

            <button
              type="submit"
              disabled={unlocking}
              className="w-full rounded-xl bg-brand-500 py-3.5 text-sm font-bold text-white shadow-lg hover:bg-brand-400 transition-all cursor-pointer disabled:opacity-50"
            >
              {unlocking ? 'Descifrando datos...' : '🔓 Desbloquear Bóveda'}
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
                <div className="mt-2 rounded-xl bg-surface-100 p-3 text-xs text-text-secondary border border-border-default">
                  💡 <strong>Pista registrada:</strong> {hint}
                </div>
              )}
            </div>
          )}
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
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-500/15 text-accent-400 border border-accent-500/30 text-xl font-bold">
            🔓
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-text-primary">
                Bóveda Desbloqueada
              </h2>
              <span className="inline-flex items-center rounded-md bg-accent-500/15 border border-accent-500/30 px-2 py-0.5 text-[10px] font-bold text-accent-400">
                AES-256 Activo
              </span>
            </div>
            <p className="text-xs text-text-muted">
              {items.length} {items.length === 1 ? 'cuenta guardada' : 'cuentas guardadas'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {/* Indicador de Auto-bloqueo */}
          <div
            className="flex items-center gap-1.5 rounded-xl border border-border-default bg-surface-100 px-3 py-1.5 text-xs text-text-secondary"
            title="Se bloqueará automáticamente por inactividad"
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
            <span>⚡</span>
            <span className="hidden sm:inline">Generar Clave</span>
          </button>

          {/* Botón Bloquear */}
          <button
            type="button"
            onClick={lockVault}
            className="inline-flex items-center gap-1.5 rounded-xl border border-danger-500/30 bg-danger-500/10 px-3 py-1.5 text-xs font-semibold text-danger-400 hover:bg-danger-500/20 transition-all cursor-pointer"
            title="Bloquear la bóveda y borrar clave de la memoria"
          >
            <span>🔒</span>
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
              🔍
            </span>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-brand-400 transition-all cursor-pointer"
        >
          <span>+</span>
          <span>Nueva Contraseña</span>
        </button>
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
          <div className="text-3xl">🔑</div>
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
            const dec = decryptedCache[item.id] || {};
            const isRevealed = !!revealedPasswords[item.id];
            const catObj = CATEGORIES.find((c) => c.id === item.category) || CATEGORIES[CATEGORIES.length - 1];

            return (
              <div
                key={item.id}
                className="group flex flex-col justify-between rounded-2xl border border-border-default/80 bg-surface-50 p-4 shadow-sm hover:border-brand-500/40 hover:shadow-md transition-all gap-3"
              >
                {/* Cabecera de la Tarjeta */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-100 border border-border-default text-lg shadow-2xs">
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
                          🌐
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="rounded-lg p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-100 transition-colors cursor-pointer"
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id, item.title)}
                        className="rounded-lg p-1.5 text-text-muted hover:text-danger-400 hover:bg-danger-500/10 transition-colors cursor-pointer"
                        title="Eliminar"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Campos Usuario y Contraseña */}
                  <div className="space-y-1.5 pt-1">
                    {/* Usuario / Email */}
                    {dec.username && (
                      <div className="flex items-center justify-between rounded-xl bg-surface-100/70 px-3 py-1.5 border border-border-default/60 text-xs">
                        <div className="min-w-0 pr-2">
                          <span className="text-[9px] uppercase tracking-wider text-text-muted block">
                            Usuario / Correo
                          </span>
                          <span className="font-medium text-text-primary truncate block font-mono text-[11px]">
                            {dec.username}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(dec.username || '', `user-${item.id}`)}
                          className="shrink-0 rounded-lg p-1 text-text-muted hover:text-brand-400 hover:bg-surface-200 transition-colors cursor-pointer text-xs"
                          title="Copiar usuario"
                        >
                          {copiedKey === `user-${item.id}` ? '✓ Copiado' : '📋'}
                        </button>
                      </div>
                    )}

                    {/* Contraseña */}
                    <div className="flex items-center justify-between rounded-xl bg-surface-100/70 px-3 py-1.5 border border-border-default/60 text-xs">
                      <div className="min-w-0 pr-2">
                        <span className="text-[9px] uppercase tracking-wider text-text-muted block">
                          Contraseña
                        </span>
                        <span className="font-bold text-text-primary truncate block font-mono text-xs tracking-wider">
                          {isRevealed ? dec.password : '••••••••••••'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            setRevealedPasswords((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
                          }
                          className="rounded-lg p-1 text-text-muted hover:text-text-primary hover:bg-surface-200 transition-colors cursor-pointer text-xs"
                          title={isRevealed ? 'Ocultar' : 'Mostrar'}
                        >
                          {isRevealed ? '🙈' : '👁️'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopy(dec.password || '', `pass-${item.id}`)}
                          className="rounded-lg px-1.5 py-1 text-xs font-semibold text-brand-400 hover:bg-brand-500/15 transition-colors cursor-pointer"
                          title="Copiar contraseña"
                        >
                          {copiedKey === `pass-${item.id}` ? '✓ Copiada' : 'Copiar'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Notas Seguras */}
                  {dec.notes && (
                    <details className="text-[11px] text-text-secondary pt-1">
                      <summary className="cursor-pointer text-text-muted hover:text-text-primary select-none font-medium">
                        Ver notas seguras...
                      </summary>
                      <div className="mt-1.5 p-2 rounded-lg bg-surface-100/50 border border-border-default/40 font-mono text-[10px] whitespace-pre-wrap break-all">
                        {dec.notes}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            );
          })}
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
                className="text-text-muted hover:text-text-primary p-1 text-sm cursor-pointer"
              >
                ✕
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
                        {cat.icon} {cat.label}
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
                    className="text-[11px] font-semibold text-brand-400 hover:underline cursor-pointer"
                  >
                    ⚡ Generar Segura
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
                    {showModalPassword ? 'Ocultar' : 'Ver'}
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
                <span className="text-xl">⚡</span>
                <h3 className="font-bold text-base text-text-primary">
                  Generador de Contraseñas Seguras
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setGenModalOpen(false)}
                className="text-text-muted hover:text-text-primary p-1 text-sm cursor-pointer"
              >
                ✕
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
                🔄 Otra combinación
              </button>
              <button
                type="button"
                onClick={() => handleCopy(generatedResult, 'gen-modal')}
                className="flex-1 rounded-xl bg-brand-500 py-2.5 text-xs font-bold text-white hover:bg-brand-400 transition-all cursor-pointer shadow-sm"
              >
                {copiedKey === 'gen-modal' ? '✓ Copiada' : '📋 Copiar Clave'}
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
    </div>
  );
}
