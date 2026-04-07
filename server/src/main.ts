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
        // Log all incoming origins in production for debugging
        if (process.env.NODE_ENV === 'production') {
          console.log(`[AIS CORS Handshake] Origin: ${origin || 'No Origin'}`);
        }

        if (!origin) return callback(null, true);
        
        const normalizedOrigin = origin.toLowerCase().trim();
        
        // Match alberta-incident.ssowemimo.com and tps-incident.ssowemimo.com (with or without dashes)
        const isDomainMatch = /https:\/\/(alberta|tps)-?incident\.ssowemimo\.com/.test(normalizedOrigin) || 
                             normalizedOrigin === 'https://albertaincident.ssowemimo.com';
                             
        const isVercelMatch = normalizedOrigin.endsWith('.vercel.app');
        const isLocalMatch = normalizedOrigin.startsWith('http://localhost:');

        if (isDomainMatch || isVercelMatch || isLocalMatch) {
          callback(null, true);
        } else {
          console.warn(`[AIS Security] CORS Unauthorized Origin attempted: ${origin}`);
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
