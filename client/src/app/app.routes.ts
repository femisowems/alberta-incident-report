import { Routes } from '@angular/router';
import { ReportWizardComponent } from './features/report-wizard/report-wizard';
import { AdminDashboard } from './features/admin-dashboard/admin-dashboard';
import { CitizenDashboard } from './features/citizen-dashboard/citizen-dashboard';
import { LoginComponent } from './features/login/login';

export const routes: Routes = [
  { path: '', redirectTo: 'report', pathMatch: 'full' },
  { path: 'report', component: ReportWizardComponent },
  { path: 'login', component: LoginComponent },
  { path: 'dashboard', component: AdminDashboard },
  { path: 'dashboard/tasks', redirectTo: 'dashboard' }, // Fix for the "NG04002: Cannot match any routes" error
  { path: 'status', component: CitizenDashboard },
  { path: '**', redirectTo: 'report' } // Global fallback
];
