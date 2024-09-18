import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Text } from './schema/text.schema';

@Injectable()
export class TextService {
  constructor(
    @InjectModel(Text.name) private textModel: Model<Text>,
  ) {}

  // Add a new text
  async addText(userId: Types.ObjectId, textData: any): Promise<Text> {
    const text = new this.textModel({
      ...textData,
      user_id: userId,
    });

    return await text.save();
  }


  // Get texts for a specific user
  async findLastSubmissions(userId: Types.ObjectId, limit: number): Promise<Text[]> {
    return this.textModel.find({ user_id: userId }).sort({ createdAt: -1 }).limit(limit).exec();
  }

  // Get the number of submissions for a user
  async getSubmissionCount(userId: Types.ObjectId): Promise<number> {
    return this.textModel.countDocuments({ user_id: userId });
  }

  // Get the last text ids for a user
  async getLastTextIds(userId: Types.ObjectId, limit: number): Promise<Types.ObjectId[]> {
    const texts = await this.textModel.find({ user_id: userId }).sort({ createdAt: -1 }).limit(limit).select('_id').exec();
    return texts.map(text => text._id) as Types.ObjectId[];
  }

  // Find a text by its id
  async findTextById(textId: Types.ObjectId): Promise<Text | null> {
    return this.textModel.findById(textId).exec();
  }
}
