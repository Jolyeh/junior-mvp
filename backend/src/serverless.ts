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
// Vercel rewrites target the function path; restore the captured API path.
export function restoreRoute(requestUrl:string):string | null {
  const url=new URL(requestUrl,'http://localhost');
  if(url.pathname!=='/api/index')return requestUrl;
  const route=url.searchParams.get('__route');
  if(!route || !/^[a-zA-Z0-9_\/-]+$/.test(route))return null;
  url.searchParams.delete('__route');
  return `/api/${route}${url.search}`;
}
export async function handler(req: Request, res: Response) {
  try {
    const original=restoreRoute(req.url);
    if(!original){res.status(404).json({statusCode:404,message:'Route introuvable.'});return;}
    req.url=original;
    ready ??= initialize();
    const serve = await ready;
    serve(req, res);
  } catch (error) {
    ready = undefined;
    console.error('Échec du démarrage de l’API serverless', error instanceof Error ? error.message : 'erreur inconnue');
    if (!res.headersSent) res.status(503).json({ statusCode: 503, message: 'Le service est temporairement indisponible.' });
  }
}
