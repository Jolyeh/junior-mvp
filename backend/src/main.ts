import 'dotenv/config';
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ErrorFilter } from './error.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const origins = (process.env.FRONTEND_ORIGINS || 'http://localhost:4200')
    .split(',').map(origin => origin.trim()).filter(Boolean);
  app.enableCors({ origin: origins });
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new ErrorFilter());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.listen(process.env.PORT || 3000, '0.0.0.0');
}
bootstrap().catch((error: unknown) => {
  console.error('Échec du démarrage de l’API :', error instanceof Error ? error.message : 'Erreur inconnue.');
  process.exitCode = 1;
});
