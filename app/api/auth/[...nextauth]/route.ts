import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope:
            process.env.GOOGLE_SCOPES ||
            "openid profile email https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file",
        },
      },
    }),
  ],
  // Configuración de sesión para que persista por mucho tiempo
  session: {
    // Usar JWT para almacenar la información de sesión
    strategy: "jwt",
    // Máximo tiempo de vida de la sesión: 1 año en segundos (muy largo)
    maxAge: 365 * 24 * 60 * 60, // 365 días
  },
  useSecureCookies: false, // En desarrollo local con HTTP
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        // Establecer maxAge para la cookie de sesión también
        maxAge: 365 * 24 * 60 * 60, // 365 días en segundos
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  // Configuración para depuración y manejo de errores
  debug: Boolean(process.env.NEXTAUTH_DEBUG),
  logger: {
    error(code, metadata) {
      console.error(`[next-auth][ERROR][${code}]`, metadata);
    },
    warn(code) {
      console.warn(`[next-auth][WARN][${code}]`);
    },
    debug(code, metadata) {
      console.log(`[next-auth][DEBUG][${code}]`, metadata);
    },
  },
  callbacks: {
    async jwt({ token, account }) {
      // Persist the OAuth access_token and refresh_token to the token right after signin
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token; // Store the refresh token
        token.accessTokenExpires = account.expires_at
          ? account.expires_at * 1000
          : undefined; // Store expiry time
      }

      // Implementar lógica para renovar el token si está expirado
      const tokenExpires = token.accessTokenExpires as number;
      const now = Date.now();

      if (tokenExpires && now > tokenExpires) {
        try {
          // Intenta renovar el token usando el refresh token
          // Esta implementación completa podría requerir una función específica
          console.log(
            "Token expirado, se debería renovar usando refresh token"
          );
          // TODO: Implementación completa de renovación de token
        } catch (error) {
          console.error("Error renovando token", error);
          // Si hay error renovando, marcamos el token como expirado pero no cerramos sesión
          token.error = "RefreshAccessTokenError";
        }
      }

      return token;
    },
    async session({ session, token }) {
      // Send properties to the client, like an access_token from a provider.
      // Make sure sensitive data like refresh tokens are not exposed client-side
      session.accessToken = token.accessToken as string | undefined;
      session.error = token.error as string | undefined; // Pass potential errors

      // Establecer una expiración muy larga para la sesión
      if (session.expires) {
        // Establecer la fecha de expiración un año en el futuro
        const oneYear = new Date();
        oneYear.setFullYear(oneYear.getFullYear() + 1);
        session.expires = oneYear.toISOString();
      }

      return session;
    },
  },
});

export { handler as GET, handler as POST };

// Add type declaration for session accessToken
// You might want to put this in a separate types file (e.g., types/next-auth.d.ts)
declare module "next-auth" {
  interface Session {
    accessToken?: string;
    error?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpires?: number;
    error?: string;
  }
}
