import type { APIRoute } from 'astro';
import { sendWelcomeEmail } from '@/lib/email';
import { db } from '@/lib/db';
import { user } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const POST: APIRoute = async (ctx) => {
  try {
    const body = await ctx.request.json();
    const { email, name, birthDate } = body;

    if (!email || !name) {
      return new Response(JSON.stringify({ error: 'Email y nombre son requeridos' }), { status: 400 });
    }

    // If birthDate was provided, update it in the database for the user
    if (birthDate) {
      try {
        await db.update(user).set({ birthDate }).where(eq(user.email, email));
      } catch (e: any) {
        console.error('Error guardando fecha de nacimiento:', e.message);
      }
    }

    // Send the welcome email
    await sendWelcomeEmail({
      to: email,
      name,
      birthDate,
    });

    return new Response(JSON.stringify({ success: true, message: 'Correo de bienvenida enviado' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Error enviando correo de bienvenida:', err.message || err);
    // Return 200 with error notice so registration flow does not break if SMTP fails
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
