import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, INestApplication } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Express } from 'express';

let cachedApp: INestApplication;
const server: Express = express();

async function bootstrap(): Promise<INestApplication> {
  if (!cachedApp) {
    const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
    
    // Enable global validation pipe for DTOs
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));
    
    // Dynamic CORS configuration for production resilience
    const allowedOrigins = [
      'https://albertaincident.ssowemimo.com',
      'https://alberta-incident.ssowemimo.com',
      'https://alberta-incident-report-client.vercel.app',
      'http://localhost:4200'
    ];

    app.enableCors({
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        
        const normalizedOrigin = origin.toLowerCase();
        const isAllowed = allowedOrigins.some(o => normalizedOrigin.startsWith(o.toLowerCase())) || 
                          normalizedOrigin.endsWith('.vercel.app');
        
        if (isAllowed) {
          callback(null, true);
        } else {
          console.warn(`[AIS Security] CORS Unauthorized Origin attempted: ${origin}`);
          // Use null, false to allow standard browser blocking without server exceptions
          callback(null, false);
        }
      },
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true,
      allowedHeaders: 'Content-Type,Accept,Authorization,X-Requested-With',
      preflightContinue: false,
      optionsSuccessStatus: 204,
    });

    app.setGlobalPrefix('api');
    await app.init();
    cachedApp = app;
  }
  return cachedApp;
}

// Vercel Serverless Function Handler
export default async (req: any, res: any) => {
  await bootstrap();
  server(req, res);
};

// Local & Production Support (Railway, etc.)
if (process.env.NODE_ENV !== 'production' || process.env.RAILWAY_ENVIRONMENT) {
  bootstrap().then(app => {
    // Railway dynamically assigns a PORT environment variable.
    // 0.0.0.0 is used to allow the internal Railway network to reach the container.
    const port = process.env.PORT || 3000;
    app.listen(port, '0.0.0.0', () => {
      console.log(`[AIS] Forensic Server listening on port ${port}`);
    });
  });
}
