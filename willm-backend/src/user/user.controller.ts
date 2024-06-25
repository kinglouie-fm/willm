// src/user/user.controller.ts
import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { UserService } from './user.service';
import { UseGuards, Get } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  async register(@Body('username') username: string, @Body('password') password: string): Promise<{ message: string }> {
    await this.userService.register(username, password);
    return { message: 'User registered successfully' };
  }

  @Post('login')
  async login(@Body('username') username: string, @Body('password') password: string): Promise<{ token: string }> {
    const isValid = await this.userService.validateUser(username, password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const token = this.userService.generateJwtToken(username);
    return { token };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async profile(@Body('username') username: string): Promise<{ username: string }> {
    return { username };
  }
}
