# FinanzasAP — Seguridad

## Principio Fundamental

> **Toda información financiera es privada por defecto.**
> Ningún dato de un usuario debe ser accesible por otro usuario, bajo ninguna circunstancia.

---

## Capas de Seguridad

### 1. Autenticación (Better Auth + Argon2id)
- Registro con email y contraseña.
- Contraseñas hasheadas con **Argon2id** (automático en Better Auth).
- Sesiones seguras con cookies `HttpOnly`, `Secure`, `SameSite=Lax`.
- Verificación de email.
- Recuperación de contraseña con tokens temporales.

### 2. Autorización (Middleware)
- Todas las rutas `/app/*` requieren sesión activa.
- El `user_id` se obtiene de la sesión en el servidor.
- Todas las queries a la base de datos incluyen `WHERE user_id = ?`.

### 3. Validación de Datos (Zod)
- Todos los inputs se validan en el servidor con Zod.
- Rangos validados:
  - APR: 0–100%
  - Saldo: ≥ 0
  - Pago mínimo: ≥ 0
  - Montos: máximo 999,999,999.99
  - Fechas: formato válido
  - Moneda: solo valores permitidos

### 4. Rate Limiting (Arcjet)
- Login: máximo 5 intentos por minuto por IP.
- API: máximo 100 requests por minuto por usuario.
- Registro: máximo 3 cuentas por hora por IP.

### 5. Headers de Seguridad (Middleware)
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

### 6. Protección CSRF
- Astro tiene `checkOrigin: true` activado en la configuración.
- Todas las mutaciones verifican el origen de la solicitud.

### 7. Contraseñas
**Nunca** se almacena una contraseña en texto plano o con hashes débiles.

```
✅ Argon2id (Better Auth lo maneja automáticamente)
❌ SHA256(password)
❌ MD5(password)
❌ password en texto plano
```

### 8. Aislamiento de Datos

```sql
-- ✅ CORRECTO
SELECT * FROM debts WHERE user_id = ?;

-- ❌ NUNCA
SELECT * FROM debts;
-- y luego filtrar en el frontend
```

---

## Reglas para Desarrolladores

1. **Nunca confíes en datos del cliente.** Valida todo en el servidor con Zod.
2. **Nunca expongas IDs internos** en URLs sin verificar propiedad.
3. **Siempre usa `user_id`** del middleware, nunca del body del request.
4. **Nunca hagas `console.log(password)`** ni logues datos sensibles.
5. **Siempre usa HTTPS** en producción.
