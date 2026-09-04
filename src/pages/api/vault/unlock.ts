import type { APIRoute } from 'astro';
import { db } from '@/lib/db';
import { vaultKeys, vaultItems, loginAttempts } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { deriveMasterKey, verifyMasterKey } from '@/lib/crypto/vault-crypto';
import { sendVaultAccessEmail } from '@/lib/email';
import { generateId } from '@/lib/utils';

const MAX_VAULT_ATTEMPTS = 3;

export const POST: APIRoute = async (ctx) => {
  const user = ctx.locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autorizado' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await ctx.request.json();
    const { pin } = body;

    if (!pin || typeof pin !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Ingresa el PIN o contraseña maestra' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 1. Obtener llaves del usuario
    const existing = await db
      .select()
      .from(vaultKeys)
      .where(eq(vaultKeys.userId, user.id))
      .limit(1);

    if (existing.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No tienes una bóveda de seguridad configurada' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { salt, verifier, verifierIv } = existing[0];
    const identifier = `vault:${user.id}`;

    // 2. Obtener intentos previos
    const attemptRows = await db
      .select()
      .from(loginAttempts)
      .where(eq(loginAttempts.identifier, identifier))
      .limit(1);

    const currentAttempts = attemptRows.length > 0 ? (attemptRows[0].attempts || 0) : 0;

    // 3. Validar PIN mediante derivación canaria
    const candidateKey = await deriveMasterKey(pin, salt);
    const isValid = await verifyMasterKey(candidateKey, verifier, verifierIv);

    if (!isValid) {
      const newAttempts = currentAttempts + 1;

      // Si alcanzó o superó 3 intentos: ¡AUTODESTRUCCIÓN DE LA BÓVEDA!
      if (newAttempts >= MAX_VAULT_ATTEMPTS) {
        console.warn(`🚨 Bóveda de usuario ${user.id} autodestruida tras ${newAttempts} intentos fallidos.`);

        // Eliminar todas las contraseñas cifradas
        await db.delete(vaultItems).where(eq(vaultItems.userId, user.id));

        // Eliminar configuración de la bóveda
        await db.delete(vaultKeys).where(eq(vaultKeys.userId, user.id));

        // Resetear contador
        if (attemptRows.length > 0) {
          await db.delete(loginAttempts).where(eq(loginAttempts.identifier, identifier));
        }

        return new Response(
          JSON.stringify({
            success: false,
            wiped: true,
            attemptsLeft: 0,
            error: 'Has fallado 3 intentos consecutivos. Por seguridad extrema, tu bóveda y todas las contraseñas almacenadas han sido eliminadas permanentemente.',
          }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // Guardar o actualizar intento fallido
      if (attemptRows.length > 0) {
        await db
          .update(loginAttempts)
          .set({ attempts: newAttempts, updatedAt: new Date() })
          .where(eq(loginAttempts.identifier, identifier));
      } else {
        await db.insert(loginAttempts).values({
          id: generateId(),
          identifier,
          attempts: newAttempts,
        });
      }

      const attemptsLeft = MAX_VAULT_ATTEMPTS - newAttempts;

      return new Response(
        JSON.stringify({
          success: false,
          wiped: false,
          attemptsLeft,
          error: `PIN incorrecto. Te queda(n) ${attemptsLeft} intento(s) antes de que la bóveda y todas las contraseñas sean borradas.`,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. PIN CORRECTO -> Resetear intentos fallidos a 0
    if (attemptRows.length > 0) {
      await db
        .update(loginAttempts)
        .set({ attempts: 0, updatedAt: new Date() })
        .where(eq(loginAttempts.identifier, identifier));
    }

    // 5. Enviar correo de notificación de acceso
    const clientIp =
      ctx.clientAddress ||
      ctx.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      'Desconocida';
    const userAgent = ctx.request.headers.get('user-agent') || 'Navegador web';

    sendVaultAccessEmail({
      to: user.email,
      name: user.name,
      ip: clientIp,
      userAgent,
      timestamp: new Date(),
    }).catch((emailErr) => {
      console.error('Error enviando notificación por correo de bóveda:', emailErr);
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Bóveda desbloqueada exitosamente',
        attemptsLeft: MAX_VAULT_ATTEMPTS,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Error en /api/vault/unlock:', err);
    return new Response(
      JSON.stringify({ error: 'Error interno al procesar el desbloqueo de la bóveda' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
