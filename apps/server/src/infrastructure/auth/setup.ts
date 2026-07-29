import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db/connection';
import { env } from '../../config/env';
import { createAuthMiddleware } from 'better-auth/api';

export const auth = betterAuth({
  baseURL: env.SERVER_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: 'sqlite' }),
  emailAndPassword: { enabled: true },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
    discord: {
      clientId: env.DISCORD_CLIENT_ID,
      clientSecret: env.DISCORD_CLIENT_SECRET,
    },
  },
  trustedOrigins: [env.FRONTEND_URL],
  account: {
    accountLinking: {
      allowDifferentEmails: true,
      enabled: true,
      trustedProviders: ["google", "discord"]
    }
  },
  // Se debe generar un hook para interceptar el unlink account
  // y verificar si es la ultima cuenta para solicitar al usuario vincular
  // una contraseña si es que aun no tiene el metodo EMAIL/PASSWORD añadido
  // hooks: {
  //   before: createAuthMiddleware(async (context) => {
  //     console.log(context);
  //     return context;
  //   })
  // }
});

console.log('[*] Better Auth configurado en', env.SERVER_URL);
