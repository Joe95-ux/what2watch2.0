import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () =>
  new PrismaClient({
    log: ["error"],
  });

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const db =
  globalForPrisma.prisma ?? prismaClientSingleton();

// Cache client on globalThis in all environments to avoid creating
// additional Prisma clients per module reload/evaluation.
globalForPrisma.prisma = db;