import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Score } from './schema/score.schema';

@Injectable()
export class ScoreService {
  constructor(@InjectModel(Score.name) private scoreModel: Model<Score>) {}

  async addScore(userId: string, sectionId: string, scoreData: any): Promise<Score> {
    const score = new this.scoreModel({
      ...scoreData,
      user_id: userId,
      section_id: sectionId,
      date_created: new Date(),
    });
    return score.save();
  }

  async findScoresByUserId(userId: string): Promise<Score[]> {
    return this.scoreModel.find({ user_id: userId }).exec();
  }
}
