import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Request, Response } from 'express';
import { AppModule } from './app.module';
import { configureApp } from './app-config';

let ready: Promise<(req: Request, res: Response) => void> | undefined;
async function initialize() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  await app.init();
  return app.getHttpAdapter().getInstance() as (req: Request, res: Response) => void;
}
export async function handler(req: Request, res: Response) {
  try {
    ready ??= initialize();
    const serve = await ready;
    serve(req, res);
  } catch (error) {
    ready = undefined;
    console.error('Échec du démarrage de l’API serverless', error instanceof Error ? error.message : 'erreur inconnue');
    if (!res.headersSent) res.status(503).json({ statusCode: 503, message: 'Le service est temporairement indisponible.' });
  }
}
