// src/auth/jwt-auth.guard.ts
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly userService: UserService) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.headers.authorization?.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }
    const decoded = this.userService.verifyJwtToken(token);
    if (!decoded) {
      throw new UnauthorizedException('Invalid token');
    }
    request.user = decoded;
    return true;
  }
}
