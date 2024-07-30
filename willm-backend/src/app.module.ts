import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { CorrectionModule } from './correction/correction.module';
import { IssueModule } from './issue/issue.module';
import { SessionModule } from './session/session.module';
import { SectionModule } from './section/section.module';
import { ScoreModule } from './score/score.module';
import { ReviewModule } from './review/review.module';
import { QuestionModule } from './question/question.module';
import { TextModule } from './text/text.module';
import { QuizModule } from './quiz/quiz.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    ConfigModule.forRoot(),
    MongooseModule.forRoot(process.env.MONGO_CONNECTION_STRING),
    UserModule,
    CorrectionModule,
    IssueModule,
    SessionModule,
    SectionModule,
    ScoreModule,
    ReviewModule,
    QuestionModule,
    TextModule,
    QuizModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
