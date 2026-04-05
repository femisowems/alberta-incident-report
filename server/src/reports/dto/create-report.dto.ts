import { IsString, IsEnum, IsNotEmpty, MinLength, IsNumber, IsOptional, IsObject, IsArray } from 'class-validator';
import { IncidentType } from '../report.entity';

export class CreateReportDto {
  @IsEnum(IncidentType)
  type: IncidentType;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  description: string;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsOptional()
  @IsObject()
  extraFields?: Record<string, any>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  media_urls?: string[];
}
