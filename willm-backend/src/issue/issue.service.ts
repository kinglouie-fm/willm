import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Issue } from './schema/issue.schema';

@Injectable()
export class IssueService {
  constructor(@InjectModel(Issue.name) private issueModel: Model<Issue>) {}

  async addIssue(user_id: string, issueData: any): Promise<void> {
    const issue = new this.issueModel({
      ...issueData,
      user_id,
    });
    await issue.save();
  }
}
