import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth';
import { AcademicModule } from './academic';
import { DocumentsModule } from './documents';
@Module({ imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]), AuthModule, AcademicModule, DocumentsModule] }) export class AppModule {}
