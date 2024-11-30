import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User, UserSchema } from './schema/user.schema';
import { SessionModule } from '../session/session.module';
import { QuizModule } from '../quiz/quiz.module';
import { TestModule } from '../test/test.module';
import { GamificationModule } from '../gamification/gamification.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    forwardRef(() => SessionModule),
    forwardRef(() => QuizModule),
    forwardRef(() => GamificationModule),
    forwardRef(() => TestModule),
  ],
  controllers: [UserController],
  providers: [UserService, JwtAuthGuard],
  exports: [UserService, MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])]
})
export class UserModule {}
