import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth';
import { AcademicModule } from './academic';
import { DocumentsModule } from './documents';
import { PrismaService } from './prisma.service';
import { PostgresThrottlerStorage } from './request-limit';
import { PrismaModule } from './prisma.module';
@Module({ imports: [PrismaModule, ThrottlerModule.forRootAsync({imports:[PrismaModule],inject:[PrismaService],useFactory:(db:PrismaService)=>({storage:new PostgresThrottlerStorage(db),throttlers:[{ttl:60000,limit:60}]})}), AuthModule, AcademicModule, DocumentsModule] }) export class AppModule {}
