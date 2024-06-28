import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CorrectionService } from './correction.service';
import { CorrectionController } from './correction.controller';
import { UserModule } from '../user/user.module';
import { IssueModule } from '../issue/issue.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
  imports: [
    UserModule, 
    HttpModule,
    IssueModule
  ],
  controllers: [CorrectionController],
  providers: [CorrectionService, JwtAuthGuard],
})
export class CorrectionModule {}
