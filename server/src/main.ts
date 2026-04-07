import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, INestApplication } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Express } from 'express';

let cachedApp: INestApplication;
const server: Express = express();

async function bootstrap(): Promise<INestApplication> {
  console.log('[AIS BOOT] Initializing Forensic Cluster...');
  
  if (!cachedApp) {
    try {
      const app = await NestFactory.create(AppModule, new ExpressAdapter(server));
      console.log('[AIS BOOT] Nest Application instance created.');
      
      // Enable global validation pipe for DTOs
      app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }));
      
      // Dynamic CORS configuration for production resilience
      app.enableCors({
        origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
          if (process.env.NODE_ENV === 'production' && origin) {
            console.log(`[AIS BOOT] CORS Request from Origin: ${origin}`);
          }

          if (!origin) return callback(null, true);
          
          const normalizedOrigin = origin.toLowerCase().trim();
          const allowedOrigins = [
            'https://albertaincident.ssowemimo.com',
            'https://alberta-incident.ssowemimo.com',
            'https://alberta-incident-report-client.vercel.app',
            'http://localhost:4200'
          ];

          const isAllowed = allowedOrigins.includes(normalizedOrigin) || 
                            normalizedOrigin.endsWith('.vercel.app');

          if (isAllowed) {
            callback(null, true);
          } else {
            console.warn(`[AIS BOOT] Unauthorized CORS Attempt: ${origin}`);
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
      console.log('[AIS BOOT] Global API prefix set.');

      await app.init();
      console.log('[AIS BOOT] Application initialized.');

      cachedApp = app;
    } catch (error) {
      console.error('[AIS BOOT CRITICAL] Bootstrap Failure:', error);
      throw error;
    }
  }
  return cachedApp;
}

// Vercel Serverless Function Handler
export default async (req: any, res: any) => {
  await bootstrap();
  server(req, res);
};

// Local & Production Support (Railway, Docker, etc.)
if (process.env.NODE_ENV !== 'production' || process.env.RAILWAY_ENVIRONMENT || process.env.PORT) {
  bootstrap().then(app => {
    const port = process.env.PORT || 3000;
    app.listen(port, '0.0.0.0', () => {
      console.log(`[AIS BOOT] Forensic Server activated on port ${port} (Host: 0.0.0.0)`);
    });
  }).catch(err => {
    console.error('[AIS BOOT CRITICAL] Server Listener Failure:', err);
  });
}
