import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { CorrectionModule } from './correction/correction.module';
import { IssueModule } from './issue/issue.module';
import { SessionModule } from './session/session.module';
import { ImprovementModule } from './improvement/improvement.module';
import { SectionModule } from './section/section.module';
import { ScoreModule } from './score/score.module';
import { ReviewModule } from './review/review.module';
import { QuestionModule } from './question/question.module';
import { TextModule } from './text/text.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRoot(process.env.MONGO_CONNECTION_STRING),
    UserModule,
    CorrectionModule,
    IssueModule,
    SessionModule,
    ImprovementModule,
    SectionModule,
    ScoreModule,
    ReviewModule,
    QuestionModule,
    TextModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
