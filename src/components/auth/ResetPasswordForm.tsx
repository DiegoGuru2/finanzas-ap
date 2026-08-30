import React, { useEffect, useState } from 'react';
import { authClient } from '@/lib/auth/client';
import PasswordInput from './PasswordInput';

export default function ResetPasswordForm() {
  const [token, setToken] = useState<string | null>(null);
  const [invalidLink, setInvalidLink] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error')) {
      setInvalidLink(true);
      return;
    }
    const t = params.get('token');
    if (t) setToken(t);
    else setInvalidLink(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 8) {
      setErrorMessage('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden');
      return;
    }
    if (!token) return;

    setLoading(true);
    try {
      const res = await authClient.resetPassword({
        newPassword: password,
        token,
      });

      if (res?.error) {
        setErrorMessage(
          res.error.message ||
            'El enlace expiró o ya fue usado. Solicita uno nuevo.'
        );
        setLoading(false);
        return;
      }

      setDone(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'No se pudo cambiar la contraseña.');
      setLoading(false);
    }
  };

  if (invalidLink) {
    return (
      <div className="space-y-5 text-center">
        <div className="rounded-xl border border-danger-500/30 bg-danger-500/10 px-4 py-5 text-sm text-danger-400">
          Este enlace de recuperación no es válido o ya expiró.
        </div>
        <a href="/forgot-password" className="inline-block text-sm font-medium text-brand-400 hover:text-brand-300">
          Solicitar un enlace nuevo
        </a>
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-5 text-center">
        <div className="rounded-xl border border-accent-500/30 bg-accent-500/10 px-4 py-5 text-sm text-accent-400">
          ✅ Tu contraseña fue actualizada correctamente.
        </div>
        <a
          href="/login"
          className="inline-block w-full rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-400"
        >
          Iniciar sesión
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-text-secondary">
          Nueva contraseña
        </label>
        <PasswordInput
          id="new-password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
        />
      </div>

      <div>
        <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium text-text-secondary">
          Confirmar contraseña
        </label>
        <PasswordInput
          id="confirm-password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
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
        {loading ? 'Guardando...' : 'Guardar nueva contraseña'}
      </button>
    </form>
  );
}
