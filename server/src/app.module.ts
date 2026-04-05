import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ReportsModule } from './reports/reports.module';
import { WorkflowModule } from './workflow/workflow.module';
import { AuditModule } from './audit/audit.module';
import { Report } from './reports/report.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        entities: [Report],
        synchronize: true, // Auto-create tables (disable in full prod)
        ssl: configService.get<string>('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false
      }),
      inject: [ConfigService],
    }),
    AuthModule, 
    UsersModule, 
    ReportsModule, 
    WorkflowModule, 
    AuditModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
