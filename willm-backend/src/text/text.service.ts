import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Text } from './schema/text.schema';
import { QuestionService } from '../question/question.service';

@Injectable()
export class TextService {
  constructor(
    @InjectModel(Text.name) private textModel: Model<Text>,
    private readonly questionService: QuestionService,
  ) {}

  async addText(userId: Types.ObjectId, textData: any): Promise<Text> {
    const text = new this.textModel({
      ...textData,
      user_id: userId,
    });

    const savedText = await text.save();

    // Count the total submissions for the user
    const submissionCount = await this.textModel.countDocuments({ user_id: userId });

    // Trigger question generation every 3 submissions
    if (submissionCount % 3 === 0) {
      console.log('Generating questions');
      await this.questionService.generateQuestions(userId);
    } else {
      console.log('Not generating questions');
    }

    return savedText;
  }

  async findLastSubmissions(userId: Types.ObjectId, limit: number): Promise<Text[]> {
    return this.textModel.find({ user_id: userId }).sort({ createdAt: -1 }).limit(limit).exec();
  }
}
