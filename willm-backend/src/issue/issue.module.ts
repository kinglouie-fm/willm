import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Issue, IssueSchema } from './schema/issue.schema';
import { IssueController } from './issue.controller';
import { IssueService } from './issue.service';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Issue.name, schema: IssueSchema }]),
    UserModule,
  ],
  controllers: [IssueController],
  providers: [IssueService],
  exports: [IssueService]
})
export class IssueModule {}
