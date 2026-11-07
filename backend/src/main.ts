import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app-config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  await app.listen(process.env.PORT || 3000, '0.0.0.0');
}
bootstrap().catch((error: unknown) => {
  console.error('Échec du démarrage de l’API :', error instanceof Error ? error.message : 'Erreur inconnue.');
  process.exitCode = 1;
});
