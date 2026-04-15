import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<PrismaClient["$extends"]> | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"],
  }).$extends(withAccelerate());

// Only cache in development (prevents hot-reload connection spam)
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}