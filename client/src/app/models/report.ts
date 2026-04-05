export enum ReportStatus {
  SUBMITTED = 'submitted',
  IN_REVIEW = 'in_review',
  ASSIGNED = 'assigned',
  RESOLVED = 'resolved',
}

export interface Report {
  id: string;
  reporter_id: string;
  type: string;
  status: ReportStatus;
  description: string;
  lat: number;
  lng: number;
  address: string;
  created_at: Date;
  updated_at: Date;
  assigned_officer_id?: string;
  assigned_unit?: string;
  isHighPriority?: boolean;
  media_urls?: string[];
  has_media?: boolean;
  evidence_count?: number;
}

export type IncidentType = 'theft' | 'vandalism' | 'traffic_complaint' | 'noise_complaint' | 'abandoned_vehicle' | 'suspicious_activity' | 'wildlife_rural' | 'other';
