import { Component, OnInit, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as L from 'leaflet';

@Component({
  selector: 'app-map-picker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './map-picker.html',
  styleUrls: ['./map-picker.css']
})
export class MapPickerComponent implements OnInit {
  @Output() locationSelected = new EventEmitter<{lat: number, lng: number, address: string}>();
  
  private map: any;
  private marker: any;
  private radiusCircle: any; // Visual Smart Zone
  
  searchQuery = signal('');
  suggestions = signal<{lat: number, lng: number, address: string}[]>([]);
  isGeocoding = signal(false);
  
  // Mock Data for Alberta Landmarks
  private mockLocations = [
    { address: 'Alberta Legislature Building, 10800 97 Ave NW, Edmonton', lat: 53.5332, lng: -113.5065 },
    { address: 'Calgary Tower, 101 9 Ave SW, Calgary', lat: 51.0443, lng: -114.0631 },
    { address: 'West Edmonton Mall, 8882 170 St NW, Edmonton', lat: 53.5225, lng: -113.6242 },
    { address: 'Heritage Park Historical Village, Calgary', lat: 50.9859, lng: -114.0950 },
    { address: 'Muttart Conservatory, 9626 96a St NW, Edmonton', lat: 53.5359, lng: -113.4722 },
    { address: 'Banff National Park, Banff', lat: 51.1784, lng: -115.5708 }
  ];

  ngOnInit() {
    this.initMap();
  }

  private initMap(): void {
    this.map = L.map('map', {
      center: [53.5461, -113.4938],
      zoom: 13,
      zoomControl: false
    });

    // Custom Zoom Position
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap'
    }).addTo(this.map);

    this.map.on('click', async (e: any) => {
      const { lat, lng } = e.latlng;
      await this.reverseGeocode(lat, lng);
    });
  }

  private async reverseGeocode(lat: number, lng: number) {
    this.isGeocoding.set(true);
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await resp.json();
      const address = data.display_name || `Location: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      this.searchQuery.set(address);
      this.selectLocation(lat, lng, address);
    } catch (err) {
      this.selectLocation(lat, lng, `Manual: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    } finally {
      this.isGeocoding.set(false);
    }
  }

  onSearchChange() {
    const query = this.searchQuery().toLowerCase();
    if (query.length > 2) {
      this.suggestions.set(
        this.mockLocations.filter(loc => loc.address.toLowerCase().includes(query))
      );
    } else {
      this.suggestions.set([]);
    }
  }

  selectSuggestion(loc: {lat: number, lng: number, address: string}) {
    this.searchQuery.set(loc.address);
    this.suggestions.set([]);
    this.map.flyTo([loc.lat, loc.lng], 17, { duration: 1.5 });
    this.selectLocation(loc.lat, loc.lng, loc.address);
  }

  private selectLocation(lat: number, lng: number, address: string) {
    // Marker Update
    if (this.marker) {
      this.marker.setLatLng([lat, lng]);
    } else {
      const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div class="w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-lg"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });
      this.marker = L.marker([lat, lng], { icon: customIcon }).addTo(this.map);
    }

    // Smart Zone (Radius Circle) Update
    if (this.radiusCircle) {
      this.radiusCircle.setLatLng([lat, lng]);
    } else {
      this.radiusCircle = L.circle([lat, lng], {
        radius: 30,
        color: '#2563eb', // blue-600
        fillColor: '#3b82f6', // blue-500
        fillOpacity: 0.15,
        weight: 1,
        className: 'pulse-circle'
      }).addTo(this.map);
    }
    
    this.locationSelected.emit({ lat, lng, address });
  }
}
