import { Injectable, UnauthorizedException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { User } from './schema/user.schema';
import { QuizService } from 'src/quiz/quiz.service';
import { SessionService } from 'src/session/session.service';

const JWT_SECRET = 'your_jwt_secret';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @Inject(forwardRef(() => QuizService)) private quizService: QuizService,
    @Inject(forwardRef(() => SessionService)) private sessionService: SessionService,
  ) {}

  async userExists(username: string): Promise<boolean> {
    const count = await this.userModel.countDocuments({ username });
    return count > 0;
  }

  async register(username: string, password: string): Promise<void> {
    const userExists = await this.userExists(username);
    if (userExists) {
      throw new Error('User already exists');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new this.userModel({
      username,
      password: hashedPassword,
      preTestsCompleted: false,
      preTestSubmissions: [],
      postTestsCompleted: false,
      postTestSubmissions: [],
    });
    await newUser.save();
  }

  async validateUser(username: string, password: string): Promise<boolean> {
    const user = await this.userModel.findOne({ username });
    if (user && await bcrypt.compare(password, user.password)) {
      return true;
    }
    return false;
  }

  generateJwtToken(username: string): string {
    return jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
  }

  verifyJwtToken(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return null;
    }
  }

  async findUserByUsername(username: string): Promise<User> {
    return this.userModel.findOne({ username }).exec();
  }

  async findUserByToken(token: string): Promise<User> {
    const decoded = this.verifyJwtToken(token);
    if (!decoded) {
      throw new UnauthorizedException('Invalid token');
    }
    return this.findUserByUsername(decoded.username);
  }

  async addPreTestSubmission(userId: string, text: string, section: string): Promise<void> {
    const user = await this.userModel.findById(userId);
    user.preTestSubmissions.push({ text, section });
    if (user.preTestSubmissions.length >= 3) {
      user.preTestsCompleted = true;
    }
    await user.save();
  }

  async completePreTest(userId: string): Promise<void> {
    const user = await this.userModel.findById(userId);
    user.preTestsCompleted = true;
    await user.save();
  }

  async addPostTestSubmission(userId: string, text: string, section: string): Promise<User> {
    const user = await this.userModel.findById(userId);
    const preTestSections = user.preTestSubmissions.map(submission => submission.section.trim().toLowerCase());
    const postTestSections = user.postTestSubmissions.map(submission => submission.section.trim().toLowerCase());

    const normalizedSection = section.trim().toLowerCase();

    // Ensure that the next section in post-test submissions matches the corresponding pre-test section
    if (postTestSections.length >= preTestSections.length || preTestSections[postTestSections.length] !== normalizedSection) {
      throw new Error('Section does not match the expected pre-test section order.');
    }

    user.postTestSubmissions.push({ text, section });

    if (user.postTestSubmissions.length >= user.preTestSubmissions.length) {
      user.postTestsCompleted = true;
    }

    await user.save();
    return user;
}

  async getPreTestSections(userId: string): Promise<string[]> {
    const user = await this.userModel.findById(userId);
    return user.preTestSubmissions.map(submission => submission.section);
  }

  async triggerQuizGeneration(user: User): Promise<{ message: string, nextQuizDate: Date | null, quizDueToday: boolean }> {
    const sessions = await this.sessionService.getSessionsByUserId(user._id.toString());
    const distinctDates = new Set(sessions.map(session => {
      const date = new Date(session.date_created);
      return date.toISOString().split('T')[0]; // Keep only the date part
    }));

    let quizDueToday = false;

    if (distinctDates.size >= 3) {
      console.log('Generating quiz for user');
      const lastQuiz = await this.quizService.getLastQuizForUser(user._id as Types.ObjectId);
      const currentDate = new Date();
      const currentDateStr = currentDate.toISOString().split('T')[0];
      const intervals = this.quizService.getIntervals();

      if (!lastQuiz) {
        // Schedule the first quiz within 24 hours of the fourth session or day
        await this.quizService.generateQuiz(user._id as Types.ObjectId);
        return { message: 'First quiz scheduled', nextQuizDate: new Date(), quizDueToday: false };
      } else {
        // Check if the last quiz is scheduled for today
        const lastQuizDateStr = lastQuiz.next_quiz_date.toISOString().split('T')[0];

        if (currentDateStr === lastQuizDateStr && !lastQuiz.missed && !lastQuiz.skipped && !lastQuiz.completed) {
          quizDueToday = true;
          return { message: 'Quiz due today', nextQuizDate: lastQuiz.next_quiz_date, quizDueToday };
        }

        if (lastQuiz.missed || lastQuiz.skipped) {
          // If the quiz was missed or skipped, adjust the interval down one step and generate a new quiz
          const intervalIndex = Math.max(intervals.indexOf(lastQuiz.interval_days) - 1, 0);
          const nextQuizDate = new Date();
          nextQuizDate.setDate(nextQuizDate.getDate() + intervals[intervalIndex]);
          await this.quizService.generateQuiz(user._id as Types.ObjectId);
          return { message: 'Next quiz scheduled after missing/skipping', nextQuizDate, quizDueToday: false };
        }
      }
    } else {
      console.log('Not enough sessions to generate quiz');
      return { message: 'Not enough sessions to generate quiz', nextQuizDate: null, quizDueToday: false };
    }
  }
}
