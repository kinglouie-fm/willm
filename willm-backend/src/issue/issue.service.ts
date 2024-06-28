import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Issue } from './schema/issue.schema';

@Injectable()
export class IssueService {
  constructor(@InjectModel(Issue.name) private issueModel: Model<Issue>) {}

  async addIssue(userId: string, issueData: any): Promise<Issue> {
    const issue = new this.issueModel({
      ...issueData,
      user_id: userId,
      issue_id: new Types.ObjectId().toString(),
    });
    return issue.save();
  }
}
