import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Issue } from './schema/issue.schema';
import { User } from '../user/schema/user.schema';

@Injectable()
export class IssueService {
  constructor(
    @InjectModel(Issue.name) private issueModel: Model<Issue>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async addIssue(userId: string, issueData: any): Promise<Issue> {
    const issue = new this.issueModel({
      ...issueData,
      user_id: userId,
    });
    const savedIssue = await issue.save();

    await this.userModel.findByIdAndUpdate(userId, { $push: { issues: savedIssue._id } });

    return savedIssue;
  }

  async getIssuesBySessions(sessionIds: Types.ObjectId[]): Promise<Issue[]> {
    return this.issueModel.find({ session: { $in: sessionIds } }).exec();
  }

  async getIssuesByTextIds(textIds: Types.ObjectId[]): Promise<Issue[]> {
    return this.issueModel.find({ text: { $in: textIds } }).exec();
  }

  async getLastIssuesByType(userId: Types.ObjectId, limit: number): Promise<Issue[]> {
    const types = ['grammar_vocab', 'organization', 'coherence', 'writing_style'];
    const issues = await Promise.all(
      types.map(type =>
        this.issueModel.find({ user_id: userId, type }).sort({ createdAt: -1 }).limit(limit).exec()
      )
    );
    return issues.flat();
  }
}
