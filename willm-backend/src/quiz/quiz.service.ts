import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Quiz } from './schema/quiz.schema';
import { IssueService } from '../issue/issue.service';
import { ReviewService } from '../review/review.service';
import { ScoreService } from '../score/score.service';
import { TextService } from '../text/text.service';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class QuizService {
  private readonly intervals = [1, 2, 4, 6]; // days for quizzes after 1st, 2nd, 3rd, and 4th quiz

  constructor(
    @InjectModel(Quiz.name) private quizModel: Model<Quiz>,
    private readonly issueService: IssueService,
    private readonly reviewService: ReviewService,
    private readonly scoreService: ScoreService,
    private readonly textService: TextService,
    private readonly httpService: HttpService,
  ) {}

  public getIntervals(): number[] {
    return this.intervals;
  }

  async generateQuiz(userId: Types.ObjectId): Promise<any> {
    // Get the last 3 text IDs
    const textIds = await this.textService.getLastTextIds(userId, 3);

    // Get issues and scores for these text IDs
    const [issues, scores] = await Promise.all([
      this.issueService.getIssuesByTextIds(textIds),
      this.scoreService.findScoresByTextIds(textIds)
    ]);

    // Get the recent review
    const recentReview = await this.reviewService.getRecentReview(userId);

    // Create a query for semantic similarity search
    const query = this.createQueryFromData(issues, recentReview, scores);

    // Check quiz history
    const quizHistory = await this.quizModel.find({ user_id: userId }).sort({ date_created: -1 }).limit(2).exec();

    let questions;
    if (quizHistory.length === 0 || quizHistory.length < 2) {
      // If no history or less than 2 quizzes, use top-k of similarity search with k=5
      const response = await lastValueFrom(this.httpService.post('http://flask-api:8000/quiz/similarity-search', { 
        user_id: userId.toString(), 
        query, 
        k: 5 
      }));
      questions = response.data;
    } else {
      // If at least 2 quizzes, give history to LLM along with top-k of similarity search with k=10
      const response = await lastValueFrom(this.httpService.post('http://flask-api:8000/quiz/similarity-search', {
        user_id: userId.toString(),
        query,
        k: 10,
        quiz_history: quizHistory.map(qh => ({
          questions: qh.questions.map(q => ({
            question_type: q.question_type,
            result: q.result
          }))
        }))
      }));
      questions = response.data;
    }

    // Determine the next quiz interval and date
    let intervalIndex = 0;
    let nextQuizDate = new Date();

    if (quizHistory.length > 0) {
      const lastQuiz = quizHistory[0];
      intervalIndex = this.intervals.indexOf(lastQuiz.interval_days);
      if (intervalIndex === -1) {
        intervalIndex = 0;
      } else {
        intervalIndex = Math.min(intervalIndex + 1, this.intervals.length - 1);
      }

      nextQuizDate.setDate(nextQuizDate.getDate() + this.intervals[intervalIndex]);

      // Adjust if the last quiz was missed
      const daysSinceLastQuiz = (new Date().getTime() - new Date(lastQuiz.next_quiz_date).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLastQuiz > this.intervals[intervalIndex] * 2) {
        intervalIndex = Math.max(intervalIndex - 1, 0);
        nextQuizDate.setDate(new Date().getDate() + this.intervals[intervalIndex]);
      }
    } else {
      // Schedule first quiz after 1 day (or the next session)
      nextQuizDate.setDate(nextQuizDate.getDate() + this.intervals[intervalIndex]);
    }

    // Store the quiz
    const quiz = new this.quizModel({
      user_id: userId,
      quiz_id: new Types.ObjectId().toString(),
      date_created: new Date(),
      questions: questions.map(q => ({
        question_id: q.question_id,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options,
        correct_answer: q.correct_answer,
        user_answer: '',
        result: false,
      })),
      interval_days: this.intervals[intervalIndex],
      next_quiz_date: nextQuizDate,
    });
    await quiz.save();

    return quiz;
  }

  createQueryFromData(issues, recentReview, scores): string {
    let query = 'Issues: ';
    issues.forEach(issue => {
      query += `${issue.category}: ${issue.corrected_text} `;
    });

    query += 'Reviews: ';
    const reviewData = recentReview.review_data;
    for (const key in reviewData) {
      query += `${key} improvements: ${reviewData[key].improvements.join(', ')} tips: ${reviewData[key].tips.join(', ')} `;
    }

    query += 'Scores: ';
    scores.forEach(score => {
      query += `Section ${score.section} - Grammar: ${score.grammar}, Vocabulary: ${score.vocabulary}, Organization: ${score.organization}, Coherence: ${score.coherence}, Writing Style: ${score.writing_style} `;
    });

    return query;
  }

  async submitQuizAnswer(userId: Types.ObjectId, quizId: string, questionId: string, userAnswer: string): Promise<any> {
    const quiz = await this.quizModel.findOne({ user_id: userId, quiz_id: quizId });

    if (!quiz) {
      throw new Error('Quiz not found');
    }

    const question = quiz.questions.find(q => q.question_id === questionId);

    if (!question) {
      throw new Error('Question not found');
    }

    question.user_answer = userAnswer;
    question.result = question.correct_answer === userAnswer;

    await quiz.save();

    return question;
  }

  async markQuizAsSkipped(userId: Types.ObjectId, quizId: string): Promise<void> {
    const quiz = await this.quizModel.findOne({ user_id: userId, quiz_id: quizId });

    if (!quiz) {
      throw new Error('Quiz not found');
    }

    quiz.skipped = true;

    const intervalIndex = this.intervals.indexOf(quiz.interval_days);
    const adjustedIntervalIndex = Math.max(intervalIndex - 1, 0);
    const nextQuizDate = new Date();
    nextQuizDate.setDate(nextQuizDate.getDate() + this.intervals[adjustedIntervalIndex]);

    quiz.next_quiz_date = nextQuizDate;
    quiz.interval_days = this.intervals[adjustedIntervalIndex];
    await quiz.save();
  }

  async markQuizAsMissed(userId: Types.ObjectId, quizId: string): Promise<void> {
    const quiz = await this.quizModel.findOne({ user_id: userId, quiz_id: quizId });

    if (!quiz) {
      throw new Error('Quiz not found');
    }

    quiz.missed = true;

    const intervalIndex = this.intervals.indexOf(quiz.interval_days);
    const adjustedIntervalIndex = Math.max(intervalIndex - 1, 0);
    const nextQuizDate = new Date();
    nextQuizDate.setDate(nextQuizDate.getDate() + this.intervals[adjustedIntervalIndex]);

    quiz.next_quiz_date = nextQuizDate;
    quiz.interval_days = this.intervals[adjustedIntervalIndex];
    await quiz.save();
  }

  async markQuizAsCompleted(userId: Types.ObjectId, quizId: string): Promise<void> {
    const quiz = await this.quizModel.findOne({ user_id: userId, quiz_id: quizId });

    if (!quiz) {
      throw new Error('Quiz not found');
    }

    quiz.completed = true;
    await quiz.save();
  }

  async getLastQuizForUser(userId: Types.ObjectId): Promise<Quiz> {
    return this.quizModel.findOne({ user_id: userId }).sort({ date_created: -1 }).exec();
  }
}
