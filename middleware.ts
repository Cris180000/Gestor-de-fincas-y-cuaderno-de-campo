import { withAuth } from "next-auth/middleware";

// Rutas que requieren estar logueado (el resto de la app)
const protectedPaths = [
  "/",
  "/fincas",
  "/parcelas",
  "/labores",
  "/incidencias",
  "/ajustes",
  "/cultivos",
  "/ndvi",
  "/costes",
  "/diagnosis",
];

export default withAuth({
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized: ({ token, req }) => {
      const pathname = req.nextUrl.pathname;
      const isProtected = protectedPaths.some(
        (p) => pathname === p || pathname.startsWith(p + "/")
      );
      if (!isProtected) return true;
      return !!token;
    },
  },
});

export const config = {
  matcher: [
    "/",
    "/fincas/:path*",
    "/parcelas/:path*",
    "/labores/:path*",
    "/incidencias/:path*",
    "/ajustes/:path*",
    "/cultivos/:path*",
    "/ndvi/:path*",
    "/costes/:path*",
    "/diagnosis/:path*",
  ],
};
