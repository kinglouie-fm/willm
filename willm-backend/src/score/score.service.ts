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
      grammar: scoreData.grammar,
      vocabulary: scoreData.vocabulary,
      organization: scoreData.organization,
      coherence: scoreData.coherence,
      writing_style: scoreData.writing_style,
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
    try {
      const allSections = await this.scoreModel.distinct('section', { user_id: userId }).exec();
      const validSections = [];

      for (const section of allSections) {
        const latestScore = await this.scoreModel.findOne({ user_id: userId, section: section }).sort({ date_created: -1 }).exec();

        if (latestScore) {
          const dateThreshold = new Date(latestScore.date_created);
          dateThreshold.setDate(dateThreshold.getDate() - 5);

          const olderScore = await this.scoreModel.findOne({ user_id: userId, section: section, date_created: { $lt: dateThreshold } }).sort({ date_created: -1 }).exec();

          if (olderScore) {
            validSections.push(section);
          }
        }
      }

      return validSections;
    } catch (error) {
      console.error("Error fetching unique sections:", error);
      throw error;
    }
  }

  async compareScores(userId: string, section: string): Promise<any> {
    const latestScore = await this.findLatestScoreBySection(userId, section);

    if (!latestScore) {
      return { message: "No scores available for the selected section." };
    }

    const dateThreshold = new Date(latestScore.date_created);
    dateThreshold.setDate(dateThreshold.getDate() - 5);

    const olderScores = await this.findOlderScoresBySection(userId, section, dateThreshold);

    if (!olderScores.length) {
      return { message: "No older scores available for comparison. Please try again later." };
    }

    console.log('Scores used for median calculation:', olderScores);
    const medianOlderScore = this.calculateMedianScore(olderScores);
    const comparison = {
      grammar: this.calculateImprovement(latestScore.grammar, medianOlderScore.grammar),
      vocabulary: this.calculateImprovement(latestScore.vocabulary, medianOlderScore.vocabulary),
      organization: this.calculateImprovement(latestScore.organization, medianOlderScore.organization),
      coherence: this.calculateImprovement(latestScore.coherence, medianOlderScore.coherence),
      writing_style: this.calculateImprovement(latestScore.writing_style, medianOlderScore.writing_style),
    };

    const daysDifference = this.calculateDaysDifference(latestScore.date_created, olderScores[olderScores.length - 1].date_created);

    return { latestScore, comparison, daysDifference, medianOlderScore };
  }

  private async findLatestScoreBySection(userId: string, section: string): Promise<Score> {
    return this.scoreModel.findOne({ user_id: userId, section: section }).sort({ date_created: -1 }).exec();
  }

  private async findOlderScoresBySection(userId: string, section: string, date: Date): Promise<Score[]> {
    return this.scoreModel.find({ user_id: userId, section: section, date_created: { $lt: date } }).sort({ date_created: -1 }).exec();
  }

  private calculateImprovement(latest: number, older: number): number {
    return ((latest - older) / older);
  }

  private calculateDaysDifference(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  private calculateMedianScore(scores: Score[]): any {
    const scoresToCalculate = scores.map(score => ({
      grammar: score.grammar,
      vocabulary: score.vocabulary,
      organization: score.organization,
      coherence: score.coherence,
      writing_style: score.writing_style,
    }));

    const median = (arr: number[]): number => {
      const sorted = arr.slice().sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    };

    return {
      grammar: median(scoresToCalculate.map(score => score.grammar)),
      vocabulary: median(scoresToCalculate.map(score => score.vocabulary)),
      organization: median(scoresToCalculate.map(score => score.organization)),
      coherence: median(scoresToCalculate.map(score => score.coherence)),
      writing_style: median(scoresToCalculate.map(score => score.writing_style)),
    };
  }
}
