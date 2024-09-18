import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CorrectionService } from './correction.service';
import { CorrectionController } from './correction.controller';
import { UserModule } from '../user/user.module';
import { IssueModule } from '../issue/issue.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SessionModule } from '../session/session.module';
import { TextModule } from '../text/text.module';
import { ScoreModule } from 'src/score/score.module';

@Module({
  imports: [
    UserModule, 
    HttpModule,
    IssueModule,
    SessionModule,
    TextModule,
    ScoreModule,
    UserModule,
  ],
  controllers: [CorrectionController],
  providers: [CorrectionService, JwtAuthGuard],
})
export class CorrectionModule {}
