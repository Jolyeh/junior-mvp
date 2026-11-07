import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { databaseDiagnostic, databaseErrorKind } from './database-error';
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL est manquante. Configurez-la dans backend/.env.');
    super({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 2, idleTimeoutMillis: 10000, connectionTimeoutMillis: 10000 }) });
  }
  async onModuleInit() {
    try {
      await this.$connect();
      // Prisma et son adaptateur peuvent établir la connexion de manière différée.
      await this.$queryRaw`SELECT 1`;
    } catch (error) {
      await this.$disconnect().catch(() => {});
      const kind = databaseErrorKind(error);
      if (kind) throw new Error(databaseDiagnostic(kind));
      throw error;
    }
  }
  async onModuleDestroy() { await this.$disconnect(); }
}
