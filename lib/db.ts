import { PrismaClient } from "@prisma/client";

// Prisma client singleton.
// In dev, Next.js hot-reload re-evaluates modules — without this guard
// each reload would spawn a new PrismaClient and exhaust DB connections.
// In production the module is loaded once per process, so no guard is needed.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
