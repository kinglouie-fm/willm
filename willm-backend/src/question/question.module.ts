import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { QuestionService } from './question.service';
import { QuestionController } from './question.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { TextModule } from '../text/text.module';
import { QuestionCount, QuestionCountSchema } from './schema/question-count.schema';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserModule } from 'src/user/user.module';
import { IssueModule } from 'src/issue/issue.module';

@Module({
  imports: [
    HttpModule,
    forwardRef(() => UserModule),
    forwardRef(() => TextModule),
    forwardRef(() => IssueModule),
    forwardRef(() => UserModule),
    MongooseModule.forFeature([{ name: QuestionCount.name, schema: QuestionCountSchema }]),
  ],
  controllers: [QuestionController],
  providers: [QuestionService, JwtAuthGuard],
  exports: [QuestionService],
})
export class QuestionModule {}
