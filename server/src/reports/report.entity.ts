import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum ReportStatus {
  SUBMITTED = 'submitted',
  IN_REVIEW = 'in_review',
  ASSIGNED = 'assigned',
  RESOLVED = 'resolved',
}

export enum IncidentType {
  THEFT = 'theft',
  VANDALISM = 'vandalism',
  TRAFFIC_COMPLAINT = 'traffic_complaint',
  NOISE_COMPLAINT = 'noise_complaint',
  ABANDONED_VEHICLE = 'abandoned_vehicle',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  WILDLIFE_RURAL = 'wildlife_rural',
  OTHER = 'other',
}

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: 'anonymous' })
  reporter_id: string;

  @Column({
    type: 'enum',
    enum: IncidentType,
    default: IncidentType.OTHER
  })
  type: IncidentType;

  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.SUBMITTED,
  })
  status: ReportStatus;

  @Column('text')
  description: string;

  @Column('decimal', { precision: 10, scale: 8, nullable: true })
  lat: number;

  @Column('decimal', { precision: 11, scale: 8, nullable: true })
  lng: number;

  @Column()
  address: string;

  @Column({ default: false })
  isHighPriority: boolean;

  @Column({ nullable: true })
  assigned_unit: string;

  @Column('simple-array', { nullable: true })
  media_urls: string[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
