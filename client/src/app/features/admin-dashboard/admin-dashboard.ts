import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Report, ReportStatus } from '../../models/report';
import { ReportsService } from '../../services/report';
import { SupabaseService } from '../../services/supabase';

interface ReportWithMeta extends Report {
  ageHours: number;
}

interface PriorityInfo {
  code: string;
  label: string;
  class: string;
}

interface TacticalUnit {
  id: string;
  name: string;
  distance: string;
  status: 'available' | 'busy';
  specialty: string;
  icon: string;
}

interface MapNode {
  ward: string;
  x: number;
  y: number;
  intensity: number;
  count: number;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css',
})
export class AdminDashboard implements OnInit {
  private reportsService = inject(ReportsService);
  private supabaseService = inject(SupabaseService);

  // Auth State
  currentUser = this.supabaseService.currentUser;

  // Master signals from central service
  reports = this.reportsService.reports;
  stats = this.reportsService.stats;

  selectedReport = signal<Report | null>(null);
  filterStatus = signal<string>('all');
  
  // Pagination State
  currentPage = signal(1);
  pageSize = signal(6);
  
  // Administrative Session Signals
  isEditing = signal(false);
  showUnitSelector = signal(false);
  
  // Roster of available municipal tactical units with specialties
  availableUnits = signal<TacticalUnit[]>([
    { 
      id: 'UNIT-7A', name: '7A-Bravo', distance: '1.2km', status: 'available', 
      specialty: 'patrol', icon: 'M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' 
    },
    { 
      id: 'UNIT-3C', name: '3C-Charlie', distance: '2.5km', status: 'available', 
      specialty: 'k9', icon: 'M16.452 7.72c-.22.1-.383.313-.43.55a13.33 13.33 0 000 3.46c.047.237.21.45.43.55.22.1.487.057.653-.11l1.732-1.732a1.33 1.33 0 000-1.88l-1.732-1.732c-.166-.167-.433-.21-.653-.11zM10.333 11a1.667 1.667 0 100-3.333 1.667 1.667 0 000 3.333z' 
    },
    { 
      id: 'UNIT-5E', name: '5E-Echo', distance: '4.8km', status: 'busy', 
      specialty: 'traffic', icon: 'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 5H4a1 1 0 00-1 1v9a1 1 0 001 1h12a1 1 0 001-1V9l-4-4z' 
    },
    { 
      id: 'UNIT-2F', name: '2F-Foxtrot', distance: '0.8km', status: 'available', 
      specialty: 'tactical', icon: 'M13 10V3L4 14h7v7l9-11h-7z' 
    }
  ]);
  
  // Stable current time for reactive SLA calculations
  private currentTime = signal(Date.now());

  // --- Operational Intelligence Mock Data ---
  
  systemHealth = signal([
    { name: 'GIS Geocoding Engine', status: 'optimal', latency: '24ms' },
    { name: 'AI Triage Logic', status: 'optimal', latency: '118ms' },
    { name: 'Notification Service', status: 'degraded', latency: '1.2s' }
  ]);

  weatherStatus = signal({
    temp: '-4°C',
    condition: 'Heavy Snow',
    alert: 'Blizzard Warning: Northern Districts',
    wildfireLevel: 'Low'
  });

  regionalStats = signal([
    { ward: 'Edmonton-Centre', count: 12, trend: 'up' },
    { ward: 'Calgary-Buffalo', count: 28, trend: 'down' },
    { ward: 'Lethbridge-West', count: 9, trend: 'stable' },
    { ward: 'Peace River', count: 5, trend: 'up' },
    { ward: 'Bow Valley', count: 15, trend: 'up' }
  ]);

  // Map nodes with stylized coordinates (Relative to 200x320 SVG viewport)
  mapNodes = computed<MapNode[]>(() => {
    const stats = this.regionalStats();
    const maxCount = Math.max(...stats.map(s => s.count), 1);
    
    const coords: Record<string, { x: number, y: number }> = {
      'Peace River': { x: 50, y: 60 },
      'Edmonton-Centre': { x: 110, y: 155 },
      'Calgary-Buffalo': { x: 120, y: 225 },
      'Lethbridge-West': { x: 130, y: 275 },
      'Bow Valley': { x: 70, y: 215 }
    };

    return stats.map(s => ({
      ...s,
      ...coords[s.ward],
      intensity: (s.count / maxCount) * 100
    }));
  });

  // Computed signal that pairs reports with their calculated age
  processedReports = computed<ReportWithMeta[]>(() => {
    const now = this.currentTime();
    return this.reports().map(report => ({
      ...report,
      ageHours: (now - new Date(report.created_at).getTime()) / (1000 * 60 * 60)
    }));
  });

  filteredReports = computed(() => {
    const status = this.filterStatus();
    const all = this.processedReports();
    if (status === 'all') return all;
    return all.filter(r => r.status === status);
  });

  paginatedReports = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize();
    const end = start + this.pageSize();
    return this.filteredReports().slice(start, end);
  });

  totalPages = computed(() => {
    return Math.ceil(this.filteredReports().length / this.pageSize());
  });

  pages = computed(() => {
    return Array.from({ length: this.totalPages() }, (_, i) => i + 1);
  });

  // TACTICAL INTELLIGENCE FOR AUDIT MODAL
  recommendedUnit = computed<TacticalUnit | null>(() => {
    const report = this.selectedReport();
    if (!report) return null;
    return this.availableUnits().find(u => this.isUnitRecommended(u)) || null;
  });

  incidentWeather = computed(() => {
    const report = this.selectedReport();
    if (!report) return null;
    
    // Simulate per-district weather based on address
    const addr = report.address.toLowerCase();
    if (addr.includes('calgary')) return { temp: '-2°C', icon: 'cloud-snow', label: 'Icy Surfaces' };
    if (addr.includes('edmonton')) return { temp: '-6°C', icon: 'wind', label: 'High Winds' };
    if (addr.includes('peace') || addr.includes('river')) return { temp: '-12°C', icon: 'blizzard', label: 'Severe Alert' };
    
    return { temp: '2°C', icon: 'cloud', label: 'Clearance Optimal' };
  });

  // AI RESOURCE MATCHING LOGIC
  isUnitRecommended(unit: TacticalUnit): boolean {
    const report = this.selectedReport();
    if (!report) return false;

    const type = report.type.toLowerCase();
    
    // Categorical Matching:
    // Theft/P1 Cases -> Tactical Response (Foxtrot)
    if (type === 'theft') return unit.specialty === 'tactical';
    
    // Suspicious Activity -> K9 Support (Charlie)
    if (type === 'suspicious_activity') return unit.specialty === 'k9';
    
    // Traffic/Vehicle -> Traffic Enforcement (Echo)
    if (type === 'traffic_complaint' || type === 'abandoned_vehicle') return unit.specialty === 'traffic';
    
    // Vandalism/Other -> Patrol (Bravo)
    if (type === 'vandalism' || type === 'other') return unit.specialty === 'patrol';

    // Wildlife/Rural -> Specialist Unit (Foxtrot - assuming tactical/specialized)
    if (type === 'wildlife_rural') return unit.specialty === 'tactical' || unit.specialty === 'k9';

    return false;
  }

  // FORENSIC TRIAGE INTELLIGENCE
  getPriorityInfo(report: Report | null): PriorityInfo {
    if (!report) return { code: 'P0', label: 'OFFLINE', class: 'bg-slate-100 text-slate-500' };
    
    // Check for manual priority override
    if (report.isHighPriority) {
      return { code: 'P1', label: 'IMMEDIATE RESPONSE', class: 'bg-rose-600 text-white animate-pulse' };
    }

    const now = this.currentTime();
    const ageHours = (now - new Date(report.created_at).getTime()) / (1000 * 60 * 60);
    const type = report.type.toLowerCase();

    if (type === 'theft' || type === 'suspicious_activity') {
      if (ageHours < 2) return { code: 'P1', label: 'IMMEDIATE RESPONSE', class: 'bg-rose-500 text-white animate-pulse' };
      return { code: 'P2', label: 'HIGH PRIORITY', class: 'bg-amber-500 text-white' };
    }

    if (ageHours > 48) return { code: 'P4', label: 'DELAYED / ARCHIVE', class: 'bg-slate-200 text-slate-600' };
    
    return { code: 'P3', label: 'STANDARD TRIAGE', class: 'bg-blue-600 text-white' };
  }

  getSLABadge(ageHours: number): string {
    if (ageHours > 48) return 'bg-rose-100 text-rose-700 border-rose-200'; // Critical
    if (ageHours > 24) return 'bg-amber-100 text-amber-700 border-amber-200'; // Warning
    return 'bg-emerald-100 text-emerald-700 border-emerald-200'; // Healthy
  }

  setFilter(status: string) {
    this.filterStatus.set(status);
    this.currentPage.set(1); // Reset to first page on filter change
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }

  selectReport(report: Report | null) {
    this.selectedReport.set(report);
    this.isEditing.set(false); // Reset session
    this.showUnitSelector.set(false); // Reset session
  }

  toggleEditMode() {
    this.isEditing.update(e => !e);
  }

  saveEdits() {
    if (this.selectedReport()) {
      const report = this.selectedReport()!;
      this.reportsService.updateReport(report.id, {
        type: report.type,
        description: report.description
      });
      this.isEditing.set(false);
    }
  }

  markAsHighPriority() {
    if (this.selectedReport()) {
      const report = this.selectedReport()!;
      const targetState = !report.isHighPriority;
      this.reportsService.updateReport(report.id, {
        isHighPriority: targetState
      });
      // Synchronize modal state
      this.selectedReport.set({ ...report, isHighPriority: targetState });
    }
  }

  initiateAssignment() {
    this.showUnitSelector.update(s => !s);
  }

  assignUnit(unitId: string) {
    if (this.selectedReport()) {
      const report = this.selectedReport()!;
      this.reportsService.updateReport(report.id, {
        status: ReportStatus.ASSIGNED,
        assigned_unit: unitId
      });
      // Synchronize modal state
      this.selectedReport.set({ ...report, status: ReportStatus.ASSIGNED, assigned_unit: unitId });
      this.showUnitSelector.set(false);
    }
  }

  ngOnInit() {
    this.reportsService.fetchAllReports();
  }
}
