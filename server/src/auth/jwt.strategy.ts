import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    const rawPublicKey = configService.get<string>('SUPABASE_JWT_PUBLIC_KEY');
    const secretKey = configService.get<string>('SUPABASE_JWT_SECRET');

    const formattedPublicKey = rawPublicKey 
      ? rawPublicKey.replace(/\\n/g, '\n').replace(/"/g, '').trim() 
      : null;
      
    const finalKey = formattedPublicKey || secretKey;

    if (!finalKey) {
      throw new Error('Neither SUPABASE_JWT_PUBLIC_KEY nor SUPABASE_JWT_SECRET is defined');
    }

    const algorithm = formattedPublicKey ? 'ES256' : 'HS256';

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: finalKey,
      algorithms: [algorithm],
      // TEMPORARILY REMOVED: audience: 'authenticated'
      // This will help us see if a claim mismatch is the culprit
    });
  }

  async validate(payload: any) {
    if (!payload) {
      console.error('[AIS Security] No payload extracted from JWT');
      return null;
    }
    
    console.log('[AIS Security] Decoded JWT Payload Success');
    console.log(`- Subject (sub): ${payload.sub}`);
    console.log(`- Role: ${payload.role}`);
    console.log(`- Audience: ${payload.aud}`);

    // Determine Role: Supabase metadata -> JWT role -> Email-based heuristics -> 'citizen'
    let rawRole = payload.user_metadata?.role || payload.role;
    let userRole = typeof rawRole === 'string' ? rawRole.trim().toLowerCase() : null;
    
    // Auto-promote system emails to admin during prototyping
    if (payload.email) {
      const email = payload.email.toLowerCase();
      if (email.includes('admin') || email.includes('officer')) {
        userRole = 'admin';
      }
    }

    const finalRole = userRole === 'authenticated' ? 'citizen' : (userRole || 'citizen');
    
    console.log(`- Resolved Role: '${finalRole}'`);

    return { 
      id: payload.sub || payload.id, // Support both standard and custom ID fields
      email: payload.email, 
      role: finalRole,
      aud: payload.aud
    };
  }
}
