import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QuizService } from './quiz.service';
import { QuizController } from './quiz.controller';
import { Quiz, QuizSchema } from './schema/quiz.schema';
import { QuizSchedule, QuizScheduleSchema } from './schema/quiz-schedule.schema';
import { IssueModule } from '../issue/issue.module';
import { ReviewModule } from '../review/review.module';
import { ScoreModule } from '../score/score.module';
import { TextModule } from '../text/text.module';
import { HttpModule } from '@nestjs/axios';
import { UserModule } from 'src/user/user.module';
import { SessionModule } from 'src/session/session.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Quiz.name, schema: QuizSchema }]),
    MongooseModule.forFeature([{ name: QuizSchedule.name, schema: QuizScheduleSchema }]),
    forwardRef(() => IssueModule),
    forwardRef(() => ReviewModule),
    forwardRef(() => ScoreModule),
    forwardRef(() => TextModule),
    forwardRef(() => UserModule),
    forwardRef(() => SessionModule),
    HttpModule,
  ],
  providers: [QuizService],
  controllers: [QuizController],
  exports: [QuizService],
})
export class QuizModule {}
