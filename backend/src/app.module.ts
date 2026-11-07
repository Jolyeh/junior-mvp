import { Module } from '@nestjs/common';
import { AuthModule } from './auth';
import { AcademicModule } from './academic';
import { DocumentsModule } from './documents';
@Module({ imports: [AuthModule, AcademicModule, DocumentsModule] }) export class AppModule {}
