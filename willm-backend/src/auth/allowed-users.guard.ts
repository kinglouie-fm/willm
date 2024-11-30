import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserService } from '../user/user.service';

@Injectable()
export class AllowedUsersGuard implements CanActivate {
  constructor(private readonly userService: UserService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.cookies['auth_token'];

    if (!token) {
      throw new ForbiddenException('No token provided.');
    }

    const user = await this.userService.findUserByToken(token);
    if (!user) {
      throw new ForbiddenException('Invalid user.');
    }

    // List of allowed usernames
    const allowedUsers = ['thillen', 'mou'];

    if (!allowedUsers.includes(user.username)) {
      throw new ForbiddenException('You do not have access to this resource.');
    }

    return true;
  }
}