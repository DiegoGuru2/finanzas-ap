import React, { useState } from 'react';
import { authClient } from '@/lib/auth/client';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await authClient.requestPasswordReset({
        email,
        redirectTo: '/reset-password',
      });

      if (res?.error) {
        setErrorMessage(res.error.message || 'No se pudo enviar el correo. Intenta de nuevo.');
        setLoading(false);
        return;
      }

      // Siempre mostramos éxito (sin revelar si el correo existe o no)
      setSent(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'No se pudo enviar el correo. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="space-y-5 text-center">
        <div className="rounded-xl border border-accent-500/30 bg-accent-500/10 px-4 py-5 text-sm text-accent-400">
          📬 Si existe una cuenta con <strong>{email}</strong>, te enviamos un enlace
          para crear una nueva contraseña. Revisa tu bandeja de entrada (y spam).
        </div>
        <a href="/login" className="inline-block text-sm font-medium text-brand-400 hover:text-brand-300">
          ← Volver a iniciar sesión
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-text-secondary">
          Correo electrónico
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder="tu@correo.com"
          className="w-full rounded-xl border border-border-default bg-surface-100 px-4 py-3 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

      {errorMessage && (
        <div className="rounded-lg bg-danger-500/10 border border-danger-500/20 px-4 py-3 text-sm text-danger-400">
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-400 hover:shadow-brand-400/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {loading ? 'Enviando enlace...' : 'Enviarme el enlace de recuperación'}
      </button>
    </form>
  );
}
