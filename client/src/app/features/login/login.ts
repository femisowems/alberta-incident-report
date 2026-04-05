import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../services/supabase';

export type AuthMode = 'login' | 'signup' | 'forgot' | 'magic';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private supaAuth = inject(SupabaseService);
  
  loading = signal(false);
  successMessage = signal('');
  errorMessage = signal('');
  viewMode = signal<AuthMode>('login');
  
  // Auth state
  currentUser = this.supaAuth.currentUser;

  // --- Forms ---
  
  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  signupForm = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required]
  }, { validators: this.passwordMatchValidator });

  forgotForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  magicLinkForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  // --- Handlers ---

  setMode(mode: AuthMode) {
    this.viewMode.set(mode);
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  private passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirm = control.get('confirmPassword');
    return password && confirm && password.value !== confirm.value ? { passwordMismatch: true } : null;
  }

  async onLogin() {
    if (this.loginForm.valid) {
      this.loading.set(true);
      this.errorMessage.set('');
      
      const email = this.loginForm.get('email')?.value!;
      const password = this.loginForm.get('password')?.value!;
      
      const { user, error } = await this.supaAuth.signInWithEmail(email, password);
      
      this.loading.set(false);
      
      if (error) {
        this.errorMessage.set(error.message);
      } else if (user) {
        if (email.includes('admin') || email.includes('officer')) {
          this.router.navigate(['/dashboard']);
        } else {
          this.router.navigate(['/status']);
        }
      }
    }
  }

  async onSignup() {
    if (this.signupForm.valid) {
      this.loading.set(true);
      this.errorMessage.set('');
      
      const email = this.signupForm.get('email')?.value!;
      const password = this.signupForm.get('password')?.value!;
      
      const { error } = await this.supaAuth.signUp(email, password);
      
      this.loading.set(false);
      
      if (error) {
        this.errorMessage.set(error.message);
      } else {
        this.successMessage.set('Account secured! Verification link injected into your email.');
        this.viewMode.set('login');
      }
    }
  }

  async onForgotPassword() {
    if (this.forgotForm.valid) {
      this.loading.set(true);
      this.errorMessage.set('');
      
      const email = this.forgotForm.get('email')?.value!;
      const { error } = await this.supaAuth.resetPassword(email);
      
      this.loading.set(false);
      
      if (error) {
        this.errorMessage.set(error.message);
      } else {
        this.successMessage.set('Recovery instructions sent to your email.');
      }
    }
  }

  async onMagicLink() {
    if (this.magicLinkForm.valid) {
      this.loading.set(true);
      this.errorMessage.set('');
      
      const email = this.magicLinkForm.get('email')?.value!;
      const { error } = await this.supaAuth.sendMagicLink(email);
      
      this.loading.set(false);
      
      if (error) {
        this.errorMessage.set(error.message);
      } else {
        this.successMessage.set('Magic link sent! Check your inbox to login.');
      }
    }
  }

  async onLogout() {
    this.loading.set(true);
    await this.supaAuth.signOut();
    this.loading.set(false);
    this.viewMode.set('login');
  }

  goToDashboard() {
    const user = this.currentUser();
    if (user && user.email) {
      if (user.email.includes('admin') || user.email.includes('officer')) {
        this.router.navigate(['/dashboard']);
      } else {
        this.router.navigate(['/status']);
      }
    }
  }
}
