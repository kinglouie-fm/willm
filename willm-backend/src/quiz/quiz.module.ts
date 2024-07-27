import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuizService } from './quiz.service';
import { QuizController } from './quiz.controller';
import { Quiz, QuizSchema } from './schema/quiz.schema';
import { IssueModule } from '../issue/issue.module';
import { ReviewModule } from '../review/review.module';
import { ScoreModule } from '../score/score.module';
import { TextModule } from '../text/text.module';
import { HttpModule } from '@nestjs/axios';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Quiz.name, schema: QuizSchema }]),
    forwardRef(() => IssueModule),
    forwardRef(() => ReviewModule),
    forwardRef(() => ScoreModule),
    forwardRef(() => TextModule),
    forwardRef(() => UserModule),
    HttpModule,
  ],
  providers: [QuizService],
  controllers: [QuizController],
  exports: [QuizService],
})
export class QuizModule {}
