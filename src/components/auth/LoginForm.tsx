import React, { useState } from 'react';
import { signIn } from '@/lib/auth/client';
import { loginSchema } from '@/modules/financial-engine/validators';
import PasswordInput from './PasswordInput';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      setErrorMessage(validation.error.issues[0]?.message || 'Datos inválidos');
      return;
    }

    setLoading(true);
    try {
      const res = await signIn.email({
        email,
        password,
      });

      if (res?.error) {
        setErrorMessage(res.error.message || 'Credenciales incorrectas');
        setLoading(false);
        return;
      }

      if (email.toLowerCase() === 'admin@finanzas.app' || (res?.data?.user as any)?.role === 'admin') {
        window.location.href = '/admin/dashboard';
      } else {
        window.location.href = '/app/dashboard';
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al iniciar sesión');
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await signIn.social({
        provider: 'google',
        callbackURL: '/app/dashboard',
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al conectar con Google');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
          placeholder="ejemplo@correo.com"
          className="w-full rounded-xl border border-border-default bg-surface-100 px-4 py-3 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium text-text-secondary">
            Contraseña
          </label>
          <a
            href="/forgot-password"
            className="text-xs font-medium text-brand-400 hover:text-brand-300"
          >
            ¿Olvidaste tu contraseña?
          </a>
        </div>
        <PasswordInput
          id="password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
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
        {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
      </button>

      {/* Google OAuth (Comentado temporalmente)
      <div className="relative my-3 flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border-default"></div>
        </div>
        <span className="relative bg-surface-0/90 px-3 text-[10px] font-bold text-text-muted uppercase tracking-wider">
          o continúa con
        </span>
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-border-default bg-surface-100/70 px-4 py-2.5 text-xs font-bold text-text-primary transition-all hover:bg-surface-100 hover:border-brand-500/30 cursor-pointer shadow-2xs disabled:opacity-50"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
        <span>Continuar con Google</span>
      </button>
      */}
    </form>
  );
}
