import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Score } from './schema/score.schema';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class ScoreService {
  constructor(
    @InjectModel(Score.name) private scoreModel: Model<Score>,
    private readonly httpService: HttpService,
  ) {}

  async generateScore(text: string, userId: string, sectionId: string): Promise<any> {
    // Make request to Flask API to generate scores
    const response = await lastValueFrom(this.httpService.post("http://flask-api:8000/generate-scores", { text }));
    const scoreData = response.data;

    // Extract scores to store in the database
    const scoresToStore = {
      grammar: scoreData.grammar.score,
      vocabulary: scoreData.vocabulary.score,
      organization: scoreData.organization.score,
      coherence: scoreData.coherence.score,
      writing_style: scoreData.writing_style.score,
    };

    // Save the scores to the database
    const score = new this.scoreModel({
      ...scoresToStore,
      user_id: userId,
      section_id: sectionId,
      date_created: new Date(),
    });

    await score.save();
    return scoreData; // Return full score data with explanations
  }

  async addScore(userId: string, sectionId: string, scoreData: any): Promise<Score> {
    const scoresToStore = {
      grammar: scoreData.grammar.score,
      vocabulary: scoreData.vocabulary.score,
      organization: scoreData.organization.score,
      coherence: scoreData.coherence.score,
      writing_style: scoreData.writing_style.score,
    };

    const score = new this.scoreModel({
      ...scoresToStore,
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
