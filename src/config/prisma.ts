import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../../generated/prisma/client.js";
import { env } from "./env.js";

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
export const prisma = new PrismaClient({ adapter });

export async function testDbConnect() {
  try {
    await prisma.$connect();

    await prisma.$queryRaw`SELECT 1`;

    console.log("Connection successfully. Neon Prisma Db is now established");
  } catch (error) {
    console.error("Error while connecting to database", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

export type DbClient = Prisma.TransactionClient | PrismaClient;
