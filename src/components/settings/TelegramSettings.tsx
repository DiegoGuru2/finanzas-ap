import React, { useState, useEffect } from 'react';
import {
  Send,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Bell,
  BellOff,
  RefreshCw,
  Trash2,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  HelpCircle,
  QrCode,
  Info,
} from 'lucide-react';

interface TelegramStatus {
  isLinked: boolean;
  telegramUsername: string | null;
  telegramNotificationsEnabled: boolean;
  botUsername: string;
  isBotConfigured: boolean;
}

export default function TelegramSettings() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [linking, setLinking] = useState(false);
  const [linkData, setLinkData] = useState<{ linkUrl: string; linkCode: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/telegram/status');
      const data = await res.json();
      if (res.ok) {
        setStatus(data);
      }
    } catch (err: any) {
      console.error('Error fetching telegram status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleStartLinking = async () => {
    try {
      setLinking(true);
      setMessage(null);
      const res = await fetch('/api/telegram/link', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo generar el enlace');
      }
      setLinkData({ linkUrl: data.linkUrl, linkCode: data.linkCode });
      // Abrir Telegram en una nueva pestaña
      window.open(data.linkUrl, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async () => {
    if (!confirm('¿Estás seguro de que deseas desconectar tu cuenta de Telegram? Dejarás de recibir alertas en el chat.')) {
      return;
    }
    try {
      setLoading(true);
      const res = await fetch('/api/telegram/link', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al desvincular');
      setMessage({ type: 'success', text: 'Cuenta de Telegram desvinculada exitosamente.' });
      setLinkData(null);
      await fetchStatus();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleNotifications = async () => {
    if (!status) return;
    try {
      setToggling(true);
      const newState = !status.telegramNotificationsEnabled;
      const res = await fetch('/api/telegram/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramNotificationsEnabled: newState }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar');
      setStatus((prev) => (prev ? { ...prev, telegramNotificationsEnabled: newState } : null));
      setMessage({
        type: 'success',
        text: newState
          ? 'Notificaciones de Telegram activadas.'
          : 'Notificaciones de Telegram silenciadas.',
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setToggling(false);
    }
  };

  const handleSendTest = async () => {
    try {
      setTesting(true);
      setMessage(null);
      const res = await fetch('/api/telegram/test', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar mensaje');
      setMessage({
        type: 'success',
        text: '¡Mensaje de prueba enviado! Revisa tu aplicación de Telegram.',
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setTesting(false);
    }
  };

  if (loading && !status) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-text-muted">
        <RefreshCw className="h-7 w-7 animate-spin text-brand-400 mb-3" />
        <span className="text-sm">Consultando estado de conexión con Telegram...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner de mensajes temporales */}
      {message && (
        <div
          className={`flex items-start gap-3 p-4 rounded-xl border text-sm transition-all animate-in fade-in ${
            message.type === 'success'
              ? 'bg-accent-500/10 border-accent-500/30 text-accent-400'
              : 'bg-danger-500/10 border-danger-500/30 text-danger-400'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 font-medium">{message.text}</div>
          <button
            onClick={() => setMessage(null)}
            className="text-xs text-text-muted hover:text-text-primary underline cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Alerta de Bot no configurado (para administradores / entorno) */}
      {status && !status.isBotConfigured && (
        <div className="flex items-start gap-3.5 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-sm">
          <Info className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">El Bot de Telegram aún no está configurado en el servidor</div>
            <div className="text-xs text-amber-200/80 mt-1 leading-relaxed">
              Para habilitar esta función, el administrador debe definir las variables{' '}
              <code className="bg-black/30 px-1.5 py-0.5 rounded text-amber-100 font-mono">
                TELEGRAM_BOT_TOKEN
              </code>{' '}
              y{' '}
              <code className="bg-black/30 px-1.5 py-0.5 rounded text-amber-100 font-mono">
                TELEGRAM_BOT_USERNAME
              </code>{' '}
              en el archivo <code className="bg-black/30 px-1.5 py-0.5 rounded font-mono">.env</code> del servidor.
            </div>
          </div>
        </div>
      )}

      {/* Tarjeta Principal de Conexión */}
      <div className="relative overflow-hidden rounded-2xl border border-border-default bg-surface-50 p-6 sm:p-8 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 border-b border-border-default/60 pb-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#229ED9]/15 text-[#229ED9] border border-[#229ED9]/30 shadow-lg shadow-[#229ED9]/10">
              <Send className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-xl font-black text-text-primary tracking-tight">
                  Asistente Financiero en Telegram
                </h3>
                {status?.isLinked ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Vinculado
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-100 text-text-muted border border-border-default">
                    No conectado
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-text-muted mt-1 leading-relaxed">
                Recibe alertas automáticas antes de cada corte de pago y consulta tus deudas y saldo libre desde cualquier lugar.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchStatus}
              disabled={loading}
              title="Actualizar estado"
              className="p-2.5 rounded-xl border border-border-default bg-surface-100/60 text-text-muted hover:text-text-primary hover:bg-surface-100 transition-colors cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Estado 1: CUENTA VINCULADA */}
        {status?.isLinked ? (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-border-default/60 bg-surface-100/40">
                <div className="text-xs font-medium text-text-muted uppercase tracking-wider">
                  Usuario de Telegram
                </div>
                <div className="text-base font-bold text-text-primary mt-1 flex items-center gap-2">
                  <span className="text-[#229ED9]">@</span>
                  {status.telegramUsername || 'Usuario conectado'}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-border-default/60 bg-surface-100/40 flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-text-muted uppercase tracking-wider">
                    Alertas automáticas
                  </div>
                  <div className="text-sm font-bold text-text-primary mt-1">
                    {status.telegramNotificationsEnabled ? 'Activas (Cortes de pago)' : 'Silenciadas'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleNotifications}
                  disabled={toggling}
                  className={`p-2.5 rounded-xl border transition-colors cursor-pointer ${
                    status.telegramNotificationsEnabled
                      ? 'bg-brand-500/20 text-brand-400 border-brand-500/40 hover:bg-brand-500/30'
                      : 'bg-surface-200 text-text-muted border-border-default hover:text-text-primary'
                  }`}
                  title={
                    status.telegramNotificationsEnabled
                      ? 'Silenciar notificaciones'
                      : 'Activar notificaciones'
                  }
                >
                  {status.telegramNotificationsEnabled ? (
                    <Bell className="h-5 w-5" />
                  ) : (
                    <BellOff className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Acciones para cuenta vinculada */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleSendTest}
                disabled={testing}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-100 hover:bg-surface-200 text-text-primary text-sm font-semibold border border-border-default transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                {testing ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-brand-400" />
                ) : (
                  <Send className="h-4 w-4 text-[#229ED9]" />
                )}
                Enviar mensaje de prueba
              </button>

              {status.botUsername && (
                <a
                  href={`https://t.me/${status.botUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-100 hover:bg-surface-200 text-text-primary text-sm font-semibold border border-border-default transition-all shadow-sm"
                >
                  <ExternalLink className="h-4 w-4 text-text-muted" />
                  Abrir chat en Telegram
                </a>
              )}

              <button
                type="button"
                onClick={handleUnlink}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-danger-400 hover:bg-danger-500/10 border border-transparent hover:border-danger-500/20 text-sm font-semibold transition-all ml-auto cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                Desvincular cuenta
              </button>
            </div>
          </div>
        ) : (
          /* Estado 2: CUENTA NO VINCULADA */
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-border-default/50 bg-surface-100/30">
                <div className="text-2xl mb-2">⏰</div>
                <div className="font-bold text-sm text-text-primary">Avisos Preventivos</div>
                <div className="text-xs text-text-muted mt-1 leading-relaxed">
                  Recibe un recordatorio automático 2 días antes, el día previo y el mismo día de tu corte.
                </div>
              </div>

              <div className="p-4 rounded-xl border border-border-default/50 bg-surface-100/30">
                <div className="text-2xl mb-2">💬</div>
                <div className="font-bold text-sm text-text-primary">Consultas Rápidas</div>
                <div className="text-xs text-text-muted mt-1 leading-relaxed">
                  Escribe <code className="text-brand-400 font-mono">/pagos</code> para ver lo que debes cubrir o <code className="text-brand-400 font-mono">/saldo</code> para ver cuánto te queda libre.
                </div>
              </div>

              <div className="p-4 rounded-xl border border-border-default/50 bg-surface-100/30">
                <div className="text-2xl mb-2">🔒</div>
                <div className="font-bold text-sm text-text-primary">100% Privado</div>
                <div className="text-xs text-text-muted mt-1 leading-relaxed">
                  Tus datos son personales y solo tú tienes acceso a tus cifras a través de tu cuenta vinculada.
                </div>
              </div>
            </div>

            {/* Enlace generado o botón inicial */}
            {linkData ? (
              <div className="p-5 rounded-2xl border border-brand-500/40 bg-brand-500/10 space-y-4 animate-in fade-in">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-brand-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold text-sm text-text-primary">
                      Paso Final: Presiona Iniciar en Telegram
                    </div>
                    <div className="text-xs text-text-muted mt-1">
                      Hemos generado tu código seguro de vinculación temporal. Se abrió Telegram en una pestaña nueva. Si no se abrió, haz clic en el botón a continuación:
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href={linkData.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#229ED9] to-[#1E88E5] text-white text-sm font-bold shadow-lg shadow-[#229ED9]/25 hover:brightness-110 transition-all"
                  >
                    <Send className="h-4 w-4" />
                    Abrir Bot en Telegram (@{status?.botUsername || 'Bot'})
                    <ExternalLink className="h-3.5 w-3.5 ml-1" />
                  </a>

                  <button
                    type="button"
                    onClick={fetchStatus}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl bg-surface-100 hover:bg-surface-200 text-text-primary text-sm font-semibold border border-border-default transition-all cursor-pointer"
                  >
                    <RefreshCw className="h-4 w-4 text-brand-400" />
                    Ya presioné "Iniciar" (Verificar)
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleStartLinking}
                  disabled={linking || !status?.isBotConfigured}
                  className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#229ED9] to-[#0288D1] text-white text-sm font-bold shadow-xl shadow-[#229ED9]/20 hover:shadow-[#229ED9]/30 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                >
                  {linking ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                  Conectar con Telegram en 1 Clic
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Guía de Comandos del Asistente */}
      <div className="rounded-2xl border border-border-default bg-surface-50 p-6 sm:p-8">
        <h4 className="text-base font-bold text-text-primary flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-brand-400" />
          Comandos que puedes escribirle a tu Bot
        </h4>
        <p className="text-xs sm:text-sm text-text-muted mt-1 mb-5">
          Una vez conectada tu cuenta, puedes enviarle cualquiera de estos mensajes en el chat de Telegram:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
          <div className="p-3.5 rounded-xl border border-border-default/60 bg-surface-100/40">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">
                /pagos
              </span>
            </div>
            <div className="text-xs text-text-muted mt-2 leading-relaxed">
              Muestra el listado de deudas y gastos fijos a cubrir en tu próximo corte de quincena o fin de mes.
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-border-default/60 bg-surface-100/40">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30">
                /saldo
              </span>
            </div>
            <div className="text-xs text-text-muted mt-2 leading-relaxed">
              Consulta tu salario proyectado, total adeudado y cuánto dinero te queda libre tras cumplir tus pagos.
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-border-default/60 bg-surface-100/40">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-surface-200 text-text-secondary border border-border-default">
                /ayuda
              </span>
            </div>
            <div className="text-xs text-text-muted mt-2 leading-relaxed">
              Despliega la lista completa de comandos e instrucciones de uso disponibles en el bot.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
