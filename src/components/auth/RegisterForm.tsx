import React, { useState } from 'react';
import { signUp } from '@/lib/auth/client';
import { registerSchema } from '@/modules/financial-engine/validators';
import PasswordInput from './PasswordInput';

export default function RegisterForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const validation = registerSchema.safeParse({ name, email, password, confirmPassword });
    if (!validation.success) {
      setErrorMessage(validation.error.issues[0]?.message || 'Datos inválidos');
      return;
    }

    setLoading(true);
    try {
      const res = await signUp.email({
        name,
        email,
        password,
      });

      if (res?.error) {
        setErrorMessage(res.error.message || 'Error al registrar usuario');
        setLoading(false);
        return;
      }

      window.location.href = '/app/dashboard';
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al registrarse');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-text-secondary">
          Nombre completo
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoComplete="name"
          placeholder="Diego Gurumendi"
          className="w-full rounded-xl border border-border-default bg-surface-100 px-4 py-3 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

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
          placeholder="diego@finanzas.app"
          className="w-full rounded-xl border border-border-default bg-surface-100 px-4 py-3 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-text-secondary">
          Contraseña
        </label>
        <PasswordInput
          id="password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          placeholder="Mínimo 8 caracteres"
        />
        <p className="mt-1.5 text-xs text-text-muted">
          Incluye mayúsculas, minúsculas y números
        </p>
      </div>

      <div>
        <label
          htmlFor="confirmPassword"
          className="mb-1.5 block text-sm font-medium text-text-secondary"
        >
          Confirmar contraseña
        </label>
        <PasswordInput
          id="confirmPassword"
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
          placeholder="Repite tu contraseña"
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
        {loading ? 'Creando cuenta...' : 'Crear cuenta'}
      </button>
    </form>
  );
}
