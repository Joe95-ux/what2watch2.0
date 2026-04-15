import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";

const prismaClientSingleton = () =>
  new PrismaClient({
    log: ["error"],
  }).$extends(withAccelerate());

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const db =
  globalForPrisma.prisma ?? prismaClientSingleton();

// Only cache in development (prevents hot-reload connection spam)
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}