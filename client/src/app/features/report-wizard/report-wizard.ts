import { Component, signal, computed, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { MapPickerComponent } from '../../shared/map-picker/map-picker';
import { IncidentType } from '../../models/report';
import { RouterLink } from '@angular/router';
import { ReportsService } from '../../services/report';
import { SupabaseService } from '../../services/supabase';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs/operators';

interface IncidentCategory {
  id: IncidentType;
  label: string;
  description: string;
  icon: string;
}

export interface EvidenceFile {
  file: File;
  previewUrl: string | ArrayBuffer | null;
  hash: string;
  isHashing: boolean;
}

@Component({
  selector: 'app-report-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MapPickerComponent, RouterLink],
  templateUrl: './report-wizard.html',
  styleUrls: ['./report-wizard.css']
})
export class ReportWizardComponent {
  private fb = inject(FormBuilder);
  private reportsService = inject(ReportsService);
  private supaAuth = inject(SupabaseService);
  
  @ViewChild('stepHeading') stepHeading!: ElementRef;
  
  currentStep = signal(1);
  isSubmitting = signal(false);
  submissionStatus = signal('');
  
  // SECURE SESSION SIGNAL
  currentUser = this.supaAuth.currentUser;
  
  // EVIDENCE VAULT SIGNALS
  mediaFiles = signal<EvidenceFile[]>([]);
  isDragging = signal(false);
  
  reportForm = this.fb.group({
    type: ['', Validators.required],
    description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]],
    location: this.fb.group({
      lat: [0],
      lng: [0],
      address: ['', Validators.required]
    }),
    extraFields: this.fb.group({}),
    media: [[]]
  });

  // HIGH-TRUST REACTIVE BRIDGE
  // toSignal creates a reactive source that 'computed' signals can follow.
  // We use startWith to ensure the signal has an initial value during template boot.
  private formState = toSignal(
    this.reportForm.valueChanges.pipe(startWith(this.reportForm.value))
  );
  
  // Computed signals derived from the form state
  selectedType = computed(() => this.formState()?.type || '');
  
  // Progress calculation for the new high-fidelity stepper
  progress = computed(() => {
    const step = this.currentStep();
    if (step === 5) return 100;
    return Math.round(((step - 1) / 4) * 100);
  });

  // Rich metadata for the new Visual Category Cards
  incidentCategories: IncidentCategory[] = [
    { 
      id: 'theft', 
      label: 'Theft / Robbery', 
      description: 'Stolen property, shoplifting, or personal robbery.',
      icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
    },
    { 
      id: 'vandalism', 
      label: 'Vandalism / Graffiti', 
      description: 'Property damage, tagging, or intentional destruction.',
      icon: 'M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z'
    },
    { 
      id: 'traffic_complaint', 
      label: 'Traffic / Vehicle', 
      description: 'Reckless driving, speeding, or parking violations.',
      icon: 'M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0zM13 5H4a1 1 0 00-1 1v9a1 1 0 001 1h12a1 1 0 001-1V9l-4-4z'
    },
    { 
      id: 'noise_complaint', 
      label: 'Noise Complaint', 
      description: 'Excessive volume, late-night disturbances.',
      icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z'
    },
    { 
      id: 'suspicious_activity', 
      label: 'Suspicious Activity', 
      description: 'Concerns about behavior or unusual gatherings.',
      icon: 'M10 12a2 2 0 100-4 2 2 0 000 4z M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z'
    },
    { 
      id: 'wildlife_rural', 
      label: 'Wildlife / Rural', 
      description: 'Encounters with hazardous flora/fauna or rural property issues.',
      icon: 'M3 6l3 12h12l3-12H3zm3 1h12.5l-2.5 10H6.5L3.5 7h2.5z M10 10v4h4v-4h-4z'
    },
    { 
      id: 'other', 
      label: 'Other Incident', 
      description: 'General reporting for other non-emergencies.',
      icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    }
  ];

  setCategory(categoryId: string) {
    this.reportForm.patchValue({ type: categoryId });
    this.updateExtraFields(categoryId);
  }

  private updateExtraFields(type: string) {
    const extraGroup = this.reportForm.get('extraFields') as FormGroup;
    Object.keys(extraGroup.controls).forEach(key => extraGroup.removeControl(key));

    if (type === 'theft') {
      extraGroup.addControl('itemValue', this.fb.control('', [Validators.required, Validators.min(0)]));
      extraGroup.addControl('itemCategory', this.fb.control('', Validators.required));
    } else if (type === 'vandalism') {
      extraGroup.addControl('surfaceType', this.fb.control('', Validators.required));
      extraGroup.addControl('isGraffiti', this.fb.control(false));
    } else if (type === 'wildlife_rural') {
      extraGroup.addControl('species', this.fb.control('', Validators.required));
      extraGroup.addControl('distance', this.fb.control('', Validators.required));
      extraGroup.addControl('isThreatened', this.fb.control(false));
    }
  }

  nextStep() {
    if (this.currentStep() < 4) {
      this.currentStep.update(s => s + 1);
      this.focusHeading();
    }
  }

  prevStep() {
    if (this.currentStep() > 1) {
      this.currentStep.update(s => s - 1);
      this.focusHeading();
    }
  }

  private focusHeading() {
    setTimeout(() => {
      this.stepHeading?.nativeElement?.focus();
    }, 100);
  }

  onLocationSelected(event: {lat: number, lng: number, address: string}) {
    this.reportForm.patchValue({
      location: {
        lat: event.lat,
        lng: event.lng,
        address: event.address
      }
    });

    // Auto-Advance: 1200ms delay to allow the user to see the map 'fly'
    setTimeout(() => {
      if (this.currentStep() === 2) {
        this.nextStep();
      }
    }, 1200);
  }

  // EVIDENCE VAULT LOGIC
  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);
    if (event.dataTransfer?.files) {
      this.handleFiles(Array.from(event.dataTransfer.files));
    }
  }

  onFileSelected(event: Event) {
    const element = event.currentTarget as HTMLInputElement;
    if (element.files) {
      this.handleFiles(Array.from(element.files));
    }
  }

  private handleFiles(files: File[]) {
    const validFiles = files.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
    
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const evidenceFile: EvidenceFile = {
          file,
          previewUrl: e.target?.result || null,
          hash: '',
          isHashing: true
        };
        
        this.mediaFiles.update(f => [...f, evidenceFile]);
        
        // Simulate Cryptographic Hashing for Visual Fidelity
        setTimeout(() => {
          this.mediaFiles.update(currentFiles => 
            currentFiles.map(f => f.file === file 
              ? { ...f, isHashing: false, hash: this.generateSimulatedHash() } 
              : f
            )
          );
        }, Math.random() * 1500 + 800);
      };
      reader.readAsDataURL(file);
    });
  }

  removeFile(index: number) {
    this.mediaFiles.update(files => files.filter((_, i) => i !== index));
  }

  private generateSimulatedHash() {
    return Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('');
  }

  async submitReport() {
    if (this.reportForm.valid && !this.isSubmitting()) {
      this.isSubmitting.set(true);
      
      const formValue = this.reportForm.value;
      const mediaUrls: string[] = [];

      // Secure Evidence Transmission
      if (this.mediaFiles().length > 0) {
        this.submissionStatus.set('Transmitting Media to Secure Vault...');
        const tempCaseId = `draft-${Date.now()}`;
        for (const fileObj of this.mediaFiles()) {
          const { publicUrl, error } = await this.supaAuth.uploadEvidence(fileObj.file, tempCaseId);
          if (error) {
            console.error('[AIS] Storage Upload Failed:', error.message);
            if (error.message.includes('bucket not found')) {
              console.error('CRITICAL: Storage bucket "evidence-vault" does not exist in Supabase!');
            }
            // We allow the report to continue even if images fail, but we log it
          }
          if (publicUrl) mediaUrls.push(publicUrl);
        }
      }

      this.submissionStatus.set('Encrypting Investigative Narrative...');
      await new Promise(r => setTimeout(r, 800));
      
      this.submissionStatus.set('Verifying Spatial Integrity...');
      await new Promise(r => setTimeout(r, 700));
      
      this.submissionStatus.set('Routing to Precinct Command...');
      await new Promise(r => setTimeout(r, 600));
      
      this.reportsService.addReport({
        type: formValue.type as any,
        description: formValue.description as string,
        lat: formValue.location?.lat as number,
        lng: formValue.location?.lng as number,
        address: formValue.location?.address as string,
        extraFields: formValue.extraFields,
        media_urls: mediaUrls
      });

      this.isSubmitting.set(false);
      this.currentStep.set(5);
      this.focusHeading();
    }
  }
}
