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
    return text.save();
  }
}
