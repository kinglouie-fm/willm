import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User, UserSchema } from './schema/user.schema';
import { SessionModule } from '../session/session.module';
import { QuizModule } from 'src/quiz/quiz.module';
import { IssueModule } from 'src/issue/issue.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    forwardRef(() => SessionModule),
    forwardRef(() => QuizModule),
    forwardRef(() => IssueModule),
  ],
  controllers: [UserController],
  providers: [UserService, JwtAuthGuard],
  exports: [UserService, MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])]
})
export class UserModule {}
