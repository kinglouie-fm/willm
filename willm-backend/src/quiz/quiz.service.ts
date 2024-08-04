import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Quiz } from './schema/quiz.schema';
import { QuizSchedule } from './schema/quiz-schedule.schema';
import { User } from '../user/schema/user.schema';
import { SessionService } from '../session/session.service';
import { IssueService } from '../issue/issue.service';
import { ReviewService } from '../review/review.service';
import { ScoreService } from '../score/score.service';
import { TextService } from '../text/text.service';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { GamificationService } from '../gamification/gamification.service';

@Injectable()
export class QuizService {
  private readonly intervals = [0, 2, 4, 6]; // days for quizzes after 1st, 2nd, 3rd, and 4th quiz

  constructor(
    @InjectModel(Quiz.name) private quizModel: Model<Quiz>,
    @InjectModel(QuizSchedule.name) private quizScheduleModel: Model<QuizSchedule>,
    private readonly issueService: IssueService,
    private readonly sessionService: SessionService,
    private readonly reviewService: ReviewService,
    private readonly scoreService: ScoreService,
    private readonly textService: TextService,
    private readonly gamificationService: GamificationService,
    private readonly httpService: HttpService,
  ) {}

  async handleLoginQuiz(user: User): Promise<{ message: string, nextQuizDate: Date | null, quizDueToday: boolean }> {
    const sessions = await this.sessionService.getSessionsByUserId(user._id.toString());
    const distinctDates = new Set(sessions.map(session => {
      const date = new Date(session.date_created);
      return date.toISOString().split('T')[0]; // Keep only the date part
    }));

    if (distinctDates.size >= 3) {
      const quizSchedule = await this.quizScheduleModel.findOne({ user_id: user._id });
      const currentDate = new Date();
      const currentDateStr = currentDate.toISOString().split('T')[0];

      if (!quizSchedule) {
        // Generate the first quiz and set the next quiz date to today
        await this.setNextQuizDate(user._id as Types.ObjectId, new Date(), 0);
        return { message: 'First quiz scheduled', nextQuizDate: new Date(), quizDueToday: true };
      } else {
        let nextQuizDateStr = quizSchedule.next_quiz_date.toISOString().split('T')[0];

        // If the next quiz date is in the past, mark the quiz as missed and reschedule
        if (currentDateStr > nextQuizDateStr) {
          await this.markQuizAsMissed(user._id as Types.ObjectId);
          nextQuizDateStr = quizSchedule.next_quiz_date.toISOString().split('T')[0];
          if (currentDateStr === nextQuizDateStr) { // Next quiz date is today
            return { message: 'Missed quiz rescheduled', nextQuizDate: quizSchedule.next_quiz_date, quizDueToday: true };
          } else { // Next quiz date is in the future
            return { message: 'Missed quiz rescheduled', nextQuizDate: quizSchedule.next_quiz_date, quizDueToday: false };
          }
        } else if (currentDateStr === nextQuizDateStr) { // Next quiz date is today
          return { message: 'Quiz due today', nextQuizDate: quizSchedule.next_quiz_date, quizDueToday: true };
        } else { // Next quiz date is in the future
          return { message: 'No quiz due today', nextQuizDate: quizSchedule.next_quiz_date, quizDueToday: false };
        }
      }
    } else {
      return { message: 'Not enough sessions to generate quiz', nextQuizDate: null, quizDueToday: false };
    }
  }

  async checkAndGenerateQuizIfDue(userId: Types.ObjectId): Promise<{ message: string, nextQuizDate: Date | null, quizDueToday: boolean }> {
    const quizSchedule = await this.quizScheduleModel.findOne({ user_id: userId });
    const currentDate = new Date();
    const currentDateStr = currentDate.toISOString().split('T')[0];

    if (!quizSchedule) {
      return { message: 'No quiz schedule found', nextQuizDate: null, quizDueToday: false };
    }

    const nextQuizDateStr = quizSchedule.next_quiz_date.toISOString().split('T')[0];

    if (currentDateStr === nextQuizDateStr) {
      // Check if there is already a quiz for today
      const existingQuiz = await this.quizModel.findOne({
        user_id: userId,
        date_created: {
          $gte: new Date(currentDateStr),
          $lt: new Date(new Date(currentDateStr).setDate(new Date(currentDateStr).getDate() + 1))
        }
      });

      if (existingQuiz) {
        // Check if all questions are answered
        const allAnswered = existingQuiz.questions.every(question => question.answered);
        if (allAnswered) {
          await this.markQuizAsCompleted(userId, existingQuiz.quiz_id);
          return { message: 'No quiz due today', nextQuizDate: quizSchedule.next_quiz_date, quizDueToday: false };
        } else {
          return { message: 'Quiz already exists for today', nextQuizDate: quizSchedule.next_quiz_date, quizDueToday: true };
        }
      } else {
        await this.generateQuiz(userId);
        return { message: 'Quiz generated', nextQuizDate: quizSchedule.next_quiz_date, quizDueToday: true };
      }
    } else {
      return { message: 'No quiz due today', nextQuizDate: quizSchedule.next_quiz_date, quizDueToday: false };
    }
  }

  async getTodaysQuiz(userId: Types.ObjectId): Promise<any> {
    const quizSchedule = await this.quizScheduleModel.findOne({ user_id: userId });
    const currentDate = new Date();
    const currentDateStr = currentDate.toISOString().split('T')[0];

    if (!quizSchedule) {
      return { message: 'No quiz schedule found' };
    }

    const nextQuizDateStr = quizSchedule.next_quiz_date.toISOString().split('T')[0];

    if (currentDateStr === nextQuizDateStr) {
      const quiz = await this.quizModel.findOne({ user_id: userId, date_created: { $gte: new Date(currentDateStr) } });
      if (quiz) {
        const quizWithoutAnswers = {
          ...quiz.toObject(),
          questions: quiz.questions.map(q => {
            const { correct_answer, ...questionWithoutAnswer } = q.toObject();
            return questionWithoutAnswer;
          })
        };
        return { quiz: quizWithoutAnswers };
      }
      return { message: 'No quiz generated for today yet' };
    } else {
      return { message: 'No quiz due today' };
    }
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
            question_id: q.question_id,
            question_type: q.question_type,
            result: q.result,
          }))
        }))
      }));
      questions = response.data;
    }

    // Prepare each question ensuring all required fields are present
    const preparedQuestions = questions.map(q => ({
      question_id: q.question_id || new Types.ObjectId().toString(),
      question_type: q.question_type || '',
      question_text: q.question_text || '',
      text: q.text || '',
      correct_answer: q.correct_answer || '',
      user_answer: '',
      word: q.word || '',
      options: q.options || [],
      sentence: q.sentence || '',
      argument: q.argument || '',
      scenario: q.scenario || [],
      result: false,
    }));

    // Store the quiz
    const quiz = new this.quizModel({
      user_id: userId,
      quiz_id: new Types.ObjectId().toString(),
      date_created: new Date(),
      questions: preparedQuestions,
      skipped: false,
      completed: false,
      score: 0,
    });
    await quiz.save();

    return { quiz };
  }

  async setNextQuizDate(userId: Types.ObjectId, date: Date, intervalIndex: number): Promise<void> {
    const existingSchedule = await this.quizScheduleModel.findOne({ user_id: userId });
    if (existingSchedule) {
      existingSchedule.next_quiz_date = date;
      existingSchedule.current_interval_index = intervalIndex;
      await existingSchedule.save();
    } else {
      const newSchedule = new this.quizScheduleModel({
        user_id: userId,
        next_quiz_date: date,
        current_interval_index: intervalIndex,
      });
      await newSchedule.save();
    }
    await this.incrementTotalQuizzes(userId);
  }

  async incrementTotalQuizzes(userId: Types.ObjectId): Promise<void> {
    await this.quizScheduleModel.findOneAndUpdate(
      { user_id: userId },
      { $inc: { total_quizzes: 1 } },
      { new: true }
    );
  }

  async incrementCompletedQuizzes(userId: Types.ObjectId): Promise<void> {
    await this.quizScheduleModel.findOneAndUpdate(
      { user_id: userId },
      { $inc: { completed_quizzes: 1 } },
      { new: true }
    );
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

  async submitQuizAnswer(userId: Types.ObjectId, quizId: string, questionId: string, userAnswer: string): Promise<{ question: any, isCorrect: boolean, correctAnswer: any, message?: string }> {
    const quiz = await this.quizModel.findOne({ user_id: userId, quiz_id: quizId });

    if (!quiz) {
      throw new Error('Quiz not found');
    }

    const question = quiz.questions.find(q => q.question_id === questionId);

    if (!question) {
      throw new Error('Question not found');
    }

    if (question.answered === true) {
      return { question, isCorrect: question.result, correctAnswer: question.correct_answer, message: 'Question already answered' };
    }

    question.user_answer = userAnswer;
    question.answered = true;
    if (question.question_type === 'academic_sentence') {
      const response = await lastValueFrom(this.httpService.post('http://flask-api:8000/question/academic_sentence_correction', { 
        original_sentence: question.sentence,
        corrected_sentence: userAnswer
      }));
      const result = response.data;

      if (result.answer.includes('Not Good')) {
        question.result = false;
      } else if (result.answer.includes('Good')) {
        question.result = true;
      } else {
        throw new Error('Unexpected response from academic sentence correction service');
      }
    } else if (['synonyms', 'argument_strengthening', 'organization', 'coherence'].includes(question.question_type)) {
      const userAnswerChar = userAnswer.charAt(0);
      const correctAnswerChar = question.correct_answer.charAt(0);

      if (userAnswerChar === correctAnswerChar) {
        question.result = true;
      } else {
        question.result = false;
      }
    } else {
      question.result = question.correct_answer === userAnswer;
    }
    
    await quiz.save();

    if (question.result) {
      await this.gamificationService.handleCorrectAnswer(userId);
    }

    return { question, isCorrect: question.result, correctAnswer: question.correct_answer };
  }

  async explainAnswer(userId: Types.ObjectId, quizId: string, questionId: string, userAnswer: string) {
    const quiz = await this.quizModel.findOne({ user_id: userId, quiz_id: quizId });

    if (!quiz) {
      throw new Error('Quiz not found');
    }

    const question = quiz.questions.find(q => q.question_id === questionId);

    if (!question) {
      throw new Error('Question not found');
    }

    const response = await lastValueFrom(this.httpService.post('http://flask-api:8000/question/explain-answer',{
        question: question,
        options: question.options || [],
        scenario: question.scenario || [],
        text: question.text || '',
        word: question.word || '',
        sentence: question.sentence || '',
        correct_answer: question.correct_answer || '',
        user_answer: userAnswer
      }));

    return response.data;
  }

  async markQuizAsSkipped(userId: Types.ObjectId, quizId: string): Promise<{ message: string, nextQuizDate: Date }> {
    const quiz = await this.quizModel.findOne({ user_id: userId, quiz_id: quizId });

    if (!quiz) {
      throw new Error('Quiz not found');
    }

    quiz.skipped = true;
    await quiz.save();

    const quizSchedule = await this.quizScheduleModel.findOne({ user_id: userId });
    const newIntervalIndex = Math.max(quizSchedule.current_interval_index - 1, 0);
    const nextQuizDate = new Date();
    nextQuizDate.setDate(nextQuizDate.getDate() + this.intervals[newIntervalIndex]);

    await this.setNextQuizDate(userId, nextQuizDate, newIntervalIndex);

    return { message: 'Quiz marked as skipped', nextQuizDate };
  }

  async markQuizAsMissed(userId: Types.ObjectId): Promise<{ message: string, nextQuizDate: Date }> {
    const quizSchedule = await this.quizScheduleModel.findOne({ user_id: userId });
    const newIntervalIndex = Math.max(quizSchedule.current_interval_index - 1, 0);
    const nextQuizDate = new Date();
    nextQuizDate.setDate(nextQuizDate.getDate() + this.intervals[newIntervalIndex]);

    await this.setNextQuizDate(userId, nextQuizDate, newIntervalIndex); 

    return { message: 'Quiz marked as missed', nextQuizDate };
  }

  async markQuizAsCompleted(userId: Types.ObjectId, quizId: string): Promise<{ message: string, score: number, nextQuizDate: Date }> {
    const quiz = await this.quizModel.findOne({ user_id: userId, quiz_id: quizId });

    if (!quiz) {
      throw new Error('Quiz not found');
    }

    quiz.completed = true;
    const score = await this.calculateQuizScore(quizId);
    quiz.score = score;
    await quiz.save();

    await this.gamificationService.handleQuizCompletion(userId, score);

    const quizSchedule = await this.quizScheduleModel.findOne({ user_id: userId });
    const newIntervalIndex = Math.min(quizSchedule.current_interval_index + 1, this.intervals.length - 1);
    const nextQuizDate = new Date();
    nextQuizDate.setDate(nextQuizDate.getDate() + this.intervals[newIntervalIndex]);

    await this.setNextQuizDate(userId, nextQuizDate, newIntervalIndex);

    await this.incrementCompletedQuizzes(userId);

    return { message: `Quiz marked as completed. Score: ${quiz.score}`, score: quiz.score, nextQuizDate };
  }

  getIntervalForCurrentDate(nextQuizDate: Date): number {
    const currentDate = new Date();
    const daysDiff = Math.ceil((nextQuizDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
    return this.intervals.find(interval => interval === daysDiff) || 0;
  }

  async calculateQuizScore(quizId: string): Promise<number> {
    const quiz = await this.quizModel.findOne({ quiz_id: quizId });

    if (!quiz) {
      throw new Error('Quiz not found');
    }

    const correctAnswers = quiz.questions.filter(q => q.result).length;

    if (correctAnswers <= 2) {
      return 1;
    } else if (correctAnswers <= 4) {
      return 2;
    } else {
      return 3;
    }
  }

  async getLastQuizForUser(userId: Types.ObjectId): Promise<Quiz> {
    return this.quizModel.findOne({ user_id: userId }).sort({ date_created: -1 }).exec();
  }
}
