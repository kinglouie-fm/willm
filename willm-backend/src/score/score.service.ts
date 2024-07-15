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

  async generateScore(text: string, userId: string, section: string): Promise<any> {
    const response = await lastValueFrom(this.httpService.post("http://flask-api:8000/generate-scores", { text }));
    const scoreData = response.data;

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
      section: section,
      date_created: new Date(),
    });

    await score.save();
    return scoreData;
  }

  async findScoresByUserId(userId: string): Promise<Score[]> {
    return this.scoreModel.find({ user_id: userId }).exec();
  }

  async getUniqueSections(userId: string): Promise<string[]> {
    console.log(`Fetching unique sections for user: ${userId}`);
    try {
      const allSections = await this.scoreModel.distinct('section', { user_id: userId }).exec();
      console.log(`All sections: ${allSections}`);
      const validSections = [];

      for (const section of allSections) {
        const latestScore = await this.scoreModel.findOne({ user_id: userId, section: section }).sort({ date_created: -1 }).exec();
        console.log(`Checking section: ${section}`);
        console.log(`Latest score: ${latestScore}`);

        if (latestScore) {
          const dateThreshold = new Date(latestScore.date_created);
          dateThreshold.setDate(dateThreshold.getDate() - 5);

          const olderScore = await this.scoreModel.findOne({ user_id: userId, section: section, date_created: { $lt: dateThreshold } }).sort({ date_created: -1 }).exec();
          console.log(`Older score: ${olderScore}`);

          if (olderScore) {
            validSections.push(section);
          }
        }
      }

      console.log("Valid sections: ", validSections);
      return validSections;
    } catch (error) {
      console.error("Error fetching unique sections:", error);
      throw error;
    }
  }

  async compareScores(userId: string, section: string): Promise<any> {
    const latestScore = await this.findLatestScoreBySection(userId, section);

    // if (!latestScore) {
    //   return { message: "No scores available for the selected section." };
    // }

    const dateThreshold = new Date(latestScore.date_created);
    dateThreshold.setDate(dateThreshold.getDate() - 5);

    const olderScore = await this.findOlderScoreBySection(userId, section, dateThreshold);

    if (!olderScore) {
      return { message: "No older scores available for comparison. Please try again later." };
    }

    const comparison = {
      grammar: this.calculateImprovement(latestScore.grammar, olderScore.grammar),
      vocabulary: this.calculateImprovement(latestScore.vocabulary, olderScore.vocabulary),
      organization: this.calculateImprovement(latestScore.organization, olderScore.organization),
      coherence: this.calculateImprovement(latestScore.coherence, olderScore.coherence),
      writing_style: this.calculateImprovement(latestScore.writing_style, olderScore.writing_style),
    };

    const daysDifference = this.calculateDaysDifference(latestScore.date_created, olderScore.date_created);

    return { latestScore, comparison, daysDifference };
  }

  private async findLatestScoreBySection(userId: string, section: string): Promise<Score> {
    return this.scoreModel.findOne({ user_id: userId, section: section }).sort({ date_created: -1 }).exec();
  }

  private async findOlderScoreBySection(userId: string, section: string, date: Date): Promise<Score> {
    return this.scoreModel.findOne({ user_id: userId, section: section, date_created: { $lt: date } }).sort({ date_created: -1 }).exec();
  }

  private calculateImprovement(latest: number, older: number): number {
    return ((latest - older) / older) * 100;
  }

  private calculateDaysDifference(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

}