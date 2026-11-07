import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ErrorFilter } from './error.filter';

export function configureApp(app: INestApplication) {
  if (process.env.VERCEL === '1') app.getHttpAdapter().getInstance().set('trust proxy', 1);
  const origins = (process.env.FRONTEND_ORIGINS || 'http://localhost:4200').split(',').map(origin => origin.trim()).filter(Boolean);
  app.enableCors({ origin: origins });
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new ErrorFilter());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
}
