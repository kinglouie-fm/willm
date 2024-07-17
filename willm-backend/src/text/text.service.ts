import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Text } from './schema/text.schema';

@Injectable()
export class TextService {
  constructor(
    @InjectModel(Text.name) private textModel: Model<Text>,
  ) {}

  async addText(userId: Types.ObjectId, textData: any): Promise<Text> {
    const text = new this.textModel({
      ...textData,
      user_id: userId,
    });

    return await text.save();
  }

  async findLastSubmissions(userId: Types.ObjectId, limit: number): Promise<Text[]> {
    return this.textModel.find({ user_id: userId }).sort({ createdAt: -1 }).limit(limit).exec();
  }

  async getSubmissionCount(userId: Types.ObjectId): Promise<number> {
    return this.textModel.countDocuments({ user_id: userId });
  }
}
