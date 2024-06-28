import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { UserService } from '../user/user.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly userService: UserService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = request.cookies['auth_token']; // Read token from cookie
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }
    const decoded = this.userService.verifyJwtToken(token);
    if (!decoded) {
      throw new UnauthorizedException('Invalid token');
    }
    const user = await this.userService.findUserByUsername(decoded.username);
    if (!user) {
      throw new UnauthorizedException('Invalid user');
    }
    request.user = user;
    return true;
  }
}
