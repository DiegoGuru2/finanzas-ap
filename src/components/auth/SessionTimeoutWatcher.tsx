import React, { useState, useEffect, useCallback, useRef } from 'react';

interface SessionTimeoutWatcherProps {
  /** Tiempo total de inactividad antes de cerrar sesión (segundos). Default: 900 (15 min) */
  timeoutSeconds?: number;
  /** Segundos de advertencia antes del cierre. Default: 60 (1 min) */
  warningSeconds?: number;
}

const STORAGE_KEY = 'proyecahorro_last_activity';
const DEFAULT_TIMEOUT_SECONDS = 15 * 60; // 15 minutos
const DEFAULT_WARNING_SECONDS = 60; // 1 minuto de advertencia

export default function SessionTimeoutWatcher({
  timeoutSeconds = DEFAULT_TIMEOUT_SECONDS,
  warningSeconds = DEFAULT_WARNING_SECONDS,
}: SessionTimeoutWatcherProps) {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(timeoutSeconds);
  const [showWarning, setShowWarning] = useState<boolean>(false);
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  const lastActivityRef = useRef<number>(Date.now());
  const throttleTimerRef = useRef<number | null>(null);

  // Ejecuta el cierre seguro de sesión y redirige
  const performLogout = useCallback(async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      // Intentar POST a /logout
      await fetch('/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {
      // Si falla la red, continuar con la redirección
    }

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}

    window.location.href = '/login?reason=timeout';
  }, [isLoggingOut]);

  // Registra actividad del usuario (sincronizada vía localStorage)
  const recordActivity = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;

    // Throttle para evitar escrituras excesivas en localStorage
    if (!throttleTimerRef.current) {
      throttleTimerRef.current = window.setTimeout(() => {
        try {
          localStorage.setItem(STORAGE_KEY, String(now));
        } catch {}
        throttleTimerRef.current = null;
      }, 1000);
    }

    if (showWarning) {
      setShowWarning(false);
    }
  }, [showWarning]);

  // Mantener sesión activa (botón en el modal)
  const handleStayLoggedIn = useCallback(async () => {
    const now = Date.now();
    lastActivityRef.current = now;
    try {
      localStorage.setItem(STORAGE_KEY, String(now));
    } catch {}
    setShowWarning(false);
    setSecondsRemaining(timeoutSeconds);

    // Opcionalmente ping a endpoint para refrescar cookie en el servidor
    try {
      await fetch('/api/auth/get-session');
    } catch {}
  }, [timeoutSeconds]);

  // Inicializar y escuchar eventos de interacción
  useEffect(() => {
    // Sincronizar timestamp inicial
    const now = Date.now();
    let initialLastActivity = now;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed > 0 && parsed <= now) {
          initialLastActivity = parsed;
        }
      }
      localStorage.setItem(STORAGE_KEY, String(initialLastActivity));
    } catch {}
    lastActivityRef.current = initialLastActivity;

    const activityEvents = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
      'click',
    ];

    const handleUserEvent = () => {
      // Si el modal está visible, no auto-ocultarlo solo por mover el ratón;
      // requerir clic explícito en "Continuar conectado" para confirmar presencia.
      if (!showWarning) {
        recordActivity();
      }
    };

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleUserEvent, { passive: true });
    });

    // Sincronización multi-pestaña: si otra pestaña tuvo actividad, actualizar aquí
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const val = parseInt(e.newValue, 10);
        if (!isNaN(val)) {
          lastActivityRef.current = val;
          setShowWarning(false);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Revisar inactividad en visibilitychange (cuando el usuario regresa tras suspender o cambiar de app)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const current = Date.now();
        let last = lastActivityRef.current;
        try {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) {
            const parsed = parseInt(stored, 10);
            if (!isNaN(parsed)) last = Math.max(last, parsed);
          }
        } catch {}

        const elapsedSec = Math.floor((current - last) / 1000);
        if (elapsedSec >= timeoutSeconds) {
          performLogout();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Intervalo de evaluación cada segundo
    const intervalId = window.setInterval(() => {
      const current = Date.now();
      let last = lastActivityRef.current;
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = parseInt(stored, 10);
          if (!isNaN(parsed)) last = Math.max(last, parsed);
        }
      } catch {}

      const elapsedSec = Math.floor((current - last) / 1000);
      const remaining = timeoutSeconds - elapsedSec;

      if (remaining <= 0) {
        setSecondsRemaining(0);
        clearInterval(intervalId);
        performLogout();
      } else if (remaining <= warningSeconds) {
        setSecondsRemaining(remaining);
        setShowWarning(true);
      } else {
        setSecondsRemaining(remaining);
        if (showWarning) {
          setShowWarning(false);
        }
      }
    }, 1000);

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleUserEvent);
      });
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
      if (throttleTimerRef.current) clearTimeout(throttleTimerRef.current);
    };
  }, [timeoutSeconds, warningSeconds, showWarning, recordActivity, performLogout]);

  if (!showWarning && !isLoggingOut) {
    return null;
  }

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const progressPercent = Math.max(0, Math.min(100, (secondsRemaining / warningSeconds) * 100));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="timeout-dialog-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md transition-all duration-300 animate-in fade-in"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-warning-500/30 bg-surface-50 p-6 shadow-2xl transition-all">
        {/* Barra superior de progreso de cuenta regresiva */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-surface-200">
          <div
            className="h-full bg-gradient-to-r from-warning-500 to-danger-500 transition-all duration-1000 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="flex flex-col items-center text-center">
          {/* Icono de Seguridad / Alerta */}
          <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-warning-500/15 border border-warning-500/30 text-warning-400">
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-warning-500"></span>
            </span>
            <svg
              className="h-8 w-8 text-warning-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h2
            id="timeout-dialog-title"
            className="text-lg sm:text-xl font-bold text-text-primary tracking-tight"
          >
            {isLoggingOut ? 'Cerrando sesión...' : '¿Sigues ahí?'}
          </h2>

          <p className="mt-2 text-xs sm:text-sm text-text-secondary leading-relaxed">
            {isLoggingOut
              ? 'Tu sesión ha finalizado por seguridad.'
              : 'Por motivos de seguridad financiera, tu sesión se cerrará automáticamente por inactividad prolongada.'}
          </p>

          {/* Reloj con cuenta regresiva */}
          {!isLoggingOut && (
            <div className="my-5 flex flex-col items-center justify-center rounded-xl bg-surface-100/80 border border-border-default px-6 py-3 shadow-inner">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                Tiempo restante
              </span>
              <span className="font-mono text-3xl font-extrabold text-warning-400 tracking-wider mt-0.5">
                {formatCountdown(secondsRemaining)}
              </span>
            </div>
          )}

          {/* Botones de acción */}
          <div className="mt-2 flex w-full flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={handleStayLoggedIn}
              disabled={isLoggingOut}
              className="flex-1 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-150 hover:bg-brand-600 hover:shadow-lg active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              Continuar conectado
            </button>
            <button
              type="button"
              onClick={() => performLogout()}
              disabled={isLoggingOut}
              className="rounded-xl border border-border-default bg-surface-100 px-4 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-danger-500/10 hover:text-danger-400 hover:border-danger-500/30 cursor-pointer"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
