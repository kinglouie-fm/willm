// src/app.module.ts
import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  imports: [],
  controllers: [UserController],
  providers: [UserService, JwtAuthGuard],
  exports: [UserService]
})
export class UserModule {}
