import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-citizen-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './citizen-dashboard.html',
  styleUrl: './citizen-dashboard.css',
})
export class CitizenDashboard {}
