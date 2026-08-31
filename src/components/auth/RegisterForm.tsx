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
            placeholder="Diego Gurumendi"
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
            placeholder="diego@finanzas.app"
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
      </div>
    </form>
  );
}
