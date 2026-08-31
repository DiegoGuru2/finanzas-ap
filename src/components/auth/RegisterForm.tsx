import React, { useState } from 'react';
import { signUp } from '@/lib/auth/client';
import { registerSchema } from '@/modules/financial-engine/validators';
import PasswordInput from './PasswordInput';

export default function RegisterForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const validation = registerSchema.safeParse({ name, email, birthDate, password, confirmPassword });
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

      // Enviar correo de bienvenida y registrar fecha de nacimiento
      try {
        await fetch('/api/auth/send-welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name, birthDate: birthDate || null }),
        });
      } catch (emailErr) {
        console.error('No se pudo enviar el correo de bienvenida:', emailErr);
      }

      window.location.href = '/app/dashboard';
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al registrarse');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Nombre completo */}
        <div>
          <label htmlFor="name" className="mb-1.5 block text-xs font-semibold text-text-secondary">
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
            placeholder="Ej. Juan Pérez"
            className="w-full rounded-xl border border-border-default bg-surface-100 px-3.5 py-2.5 text-xs text-text-primary placeholder:text-text-muted transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        {/* Correo electrónico */}
        <div>
          <label htmlFor="email" className="mb-1.5 block text-xs font-semibold text-text-secondary">
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
            className="w-full rounded-xl border border-border-default bg-surface-100 px-3.5 py-2.5 text-xs text-text-primary placeholder:text-text-muted transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        {/* Fecha de nacimiento */}
        <div>
          <label htmlFor="birthDate" className="mb-1.5 block text-xs font-semibold text-text-secondary">
            Fecha de nacimiento <span className="text-[10px] text-text-muted font-normal">(Opcional)</span>
          </label>
          <input
            type="date"
            id="birthDate"
            name="birthDate"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="w-full rounded-xl border border-border-default bg-surface-100 px-3.5 py-2.5 text-xs text-text-primary transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
        </div>

        {/* Info card banner */}
        <div className="flex items-center gap-2.5 rounded-xl border border-border-default/60 bg-surface-100/50 p-3 text-[11px] text-text-muted">
          <span className="text-base">🔒</span>
          <span>Tus datos financieros están protegidos con cifrado y confidencialidad.</span>
        </div>

        {/* Contraseña */}
        <div>
          <label htmlFor="password" className="mb-1.5 block text-xs font-semibold text-text-secondary">
            Contraseña
          </label>
          <PasswordInput
            id="password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            placeholder="Mínimo 8 caracteres"
          />
          <p className="mt-1 text-[10px] text-text-muted">
            Mínimo 8 caracteres
          </p>
        </div>

        {/* Confirmar contraseña */}
        <div>
          <label htmlFor="confirmPassword" className="mb-1.5 block text-xs font-semibold text-text-secondary">
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
      </div>

      {errorMessage && (
        <div className="rounded-xl bg-danger-500/10 border border-danger-500/20 px-3.5 py-2.5 text-xs text-danger-400">
          {errorMessage}
        </div>
      )}

      <div className="pt-2">
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-brand-500 py-3 text-xs font-bold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-400 hover:shadow-brand-400/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>

        {/* Google OAuth (Comentado temporalmente)
        <div className="relative my-2 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border-default"></div>
          </div>
          <span className="relative bg-surface-0/90 px-3 text-[10px] font-bold text-text-muted uppercase tracking-wider">
            o regístrate con
          </span>
        </div>

        <button
          type="button"
          onClick={async () => {
            try {
              setLoading(true);
              await signUp.social({
                provider: 'google',
                callbackURL: '/app/dashboard',
              });
            } catch (err: any) {
              setErrorMessage(err.message || 'Error al conectar con Google');
              setLoading(false);
            }
          }}
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
      </div>
    </form>
  );
}
