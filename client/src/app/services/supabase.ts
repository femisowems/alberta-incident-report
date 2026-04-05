import { Injectable, signal } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

export interface AuthResponse {
  user: User | null;
  error: Error | null;
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;
  public currentUser = signal<User | null>(null);

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl, 
      environment.supabaseKey
    );
    
    // Automatically capture session state on init
    this.supabase.auth.getSession().then(({ data: { session } }) => {
      this.currentUser.set(session?.user ?? null);
    });

    // Listen for auth state changes globally
    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.currentUser.set(session?.user ?? null);
    });
  }

  // --- AUTHENTICATION --- //

  async signInWithEmail(email: string, password: string): Promise<AuthResponse> {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
    return { user: data.user, error };
  }

  async signUp(email: string, password: string): Promise<AuthResponse> {
    const { data, error } = await this.supabase.auth.signUp({ email, password });
    return { user: data.user, error };
  }

  async signOut(): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.auth.signOut();
    return { error };
  }

  async resetPassword(email: string): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email);
    return { error };
  }

  async sendMagicLink(email: string): Promise<{ error: Error | null }> {
    const { error } = await this.supabase.auth.signInWithOtp({ email });
    return { error };
  }

  // --- EVIDENCE VAULT STORAGE --- //

  /**
   * Uploads visual intelligence files directly to the Supabase Storage Bucket.
   * Required: A public bucket named 'evidence-vault' must exist in the Supabase Dashboard.
   */
  async uploadEvidence(file: File, caseId: string): Promise<{ publicUrl: string | null; error: Error | null }> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${caseId}/${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `uploads/${fileName}`;

    const { error: uploadError } = await this.supabase.storage
      .from('evidence-vault')
      .upload(filePath, file);

    if (uploadError) {
      return { publicUrl: null, error: uploadError };
    }

    const { data } = this.supabase.storage
      .from('evidence-vault')
      .getPublicUrl(filePath);

    return { publicUrl: data.publicUrl, error: null };
  }
}
