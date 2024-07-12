import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Score } from './schema/score.schema';
import { lastValueFrom } from 'rxjs';
import { SectionService } from '../section/section.service';

@Injectable()
export class ScoreService {
  constructor(
    @InjectModel(Score.name) private scoreModel: Model<Score>,
    private readonly httpService: HttpService,
    private readonly sectionService: SectionService,
  ) {}

  async generateScore(text: string, userId: string, sectionText: string): Promise<any> {
    // Find or create the section
    let section = await this.sectionService.findSectionByPayload(userId, sectionText);
    if (!section) {
      section = await this.sectionService.addSection(userId, {
        payload: sectionText,
        date_created: new Date(),
      });
    }

    const response = await lastValueFrom(this.httpService.post('http://flask-api:8000/generate-scores', { text }));
    const scoreData = response.data;

    const score = new this.scoreModel({
      ...scoreData,
      user_id: userId,
      section_id: section._id,
      date_created: new Date(),
    });

    await score.save();
    return scoreData;
  }

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
