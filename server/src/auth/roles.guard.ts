import { SetMetadata, Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from './roles.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    console.log(`[AIS Security] Incoming Request. User data: ${JSON.stringify(user, null, 2)}`);
    console.log(`[AIS Security] Endpoint requires roles: ${requiredRoles.join(', ')}`);
    
    // Explicitly cast to string for primitive comparison
    const userRole = String(user?.role).trim().toLowerCase();
    const isApproved = requiredRoles.some(role => String(role).trim().toLowerCase() === userRole);
    
    console.log(`[AIS Security] Result: ${isApproved ? 'GRANTED' : 'DENIED'}`);
    
    if (!isApproved) {
      console.trace('[AIS Security] Stack Trace for 403 Denial:');
    }
    
    return isApproved;
  }
}
