import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Report, ReportStatus } from '../models/report';
import { SupabaseService } from './supabase';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ReportsService {
  private http = inject(HttpClient);
  private supaAuth = inject(SupabaseService);
  private apiUrl = `${environment.apiUrl}/reports`;

  // Master Signal for all incidents (initialized empty instead of mocked)
  private _reports = signal<Report[]>([]);

  // Read-only access to reports
  public reports = this._reports.asReadonly();

  // Computed Stats
  public stats = computed(() => {
    const all = this._reports();
    return {
      total: all.length,
      pending: all.filter(r => r.status === ReportStatus.SUBMITTED).length,
      resolved: all.filter(r => r.status === ReportStatus.RESOLVED).length
    };
  });

  constructor() {}

  /**
   * Generates authorization headers using the live Supabase Session Token
   */
  private async getAuthHeaders(): Promise<HttpHeaders> {
    // Attempt to pull the active JWT from Supabase natively
    const sessionResponse = await this.supaAuth['supabase'].auth.getSession();
    const token = sessionResponse.data.session?.access_token || '';
    
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  /**
   * Fetches all official incident permutations from the central database.
   * Requires Officer or Admin authorization matrix.
   */
  async fetchAllReports() {
    try {
      const headers = await this.getAuthHeaders();
      this.http.get<Report[]>(this.apiUrl, { headers }).subscribe({
        next: (data) => this._reports.set(data),
        error: (err) => console.error('[AIS] Secure Sync Failure: ', err)
      });
    } catch (e) {
      console.error('API Error:', e);
    }
  }

  /**
   * Transmits a new report up to the NestJS PostgreSQL Registry.
   */
  async addReport(reportData: any) {
    try {
      const headers = await this.getAuthHeaders();
      
      const payload = {
        type: reportData.type || 'other',
        description: reportData.description || '',
        lat: reportData.lat || 0,
        lng: reportData.lng || 0,
        address: reportData.address || 'Unknown Address',
        extraFields: reportData.extraFields || {},
        media_urls: reportData.media_urls || []
      };

      console.log('[AIS] Transmitting Record to API:', payload);

      this.http.post<Report>(this.apiUrl, payload, { headers }).subscribe({
        next: (savedReport) => {
          console.log('[AIS] Persistent Record Created:', savedReport);
          // Immediately project the saved record into UI memory for instant reactivity
          this._reports.update(current => [savedReport, ...current]);
        },
        error: (err) => console.error('[AIS] Insertion Failure: ', err)
      });
    } catch (e) {
      console.error('API Error:', e);
    }
  }

  /**
   * Dispatches targeted metadata updates for specific columns in the Case Record.
   */
  async updateReport(id: string, updates: Partial<Report>) {
    try {
      const headers = await this.getAuthHeaders();
      
      this.http.patch<Report>(`${this.apiUrl}/${id}`, updates, { headers }).subscribe({
        next: (updatedRecord) => {
          this._reports.update(all => 
            all.map(report => report.id === id ? { ...report, ...updatedRecord } : report)
          );
        },
        error: (err) => console.error('[AIS] Mutation Rejection: ', err)
      });
    } catch (e) {
      console.error('API Error:', e);
    }
  }
}
