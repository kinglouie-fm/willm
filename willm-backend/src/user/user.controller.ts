import { Controller, Post, Body, Res, UnauthorizedException, Get, Req, BadRequestException, UseGuards } from '@nestjs/common';
import { Response, Request } from 'express';
import { UserService } from './user.service';
import { isAfter, parseISO } from 'date-fns';
import { QuizService } from '../quiz/quiz.service';
import { GamificationService } from '../gamification/gamification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Types } from 'mongoose';

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly quizService: QuizService,
    private readonly gamificationService: GamificationService,
  ) {}

  @Post('register')
  async register(
    @Body('username') username: string,
    @Body('password') password: string,
    @Body('dataPrivacyConsent') dataPrivacyConsent: boolean,
    @Res() res: Response
  ): Promise<void> {
    if (!dataPrivacyConsent) {
      throw new UnauthorizedException('Data privacy consent is required.');
    }
    try {
      await this.userService.register(username, password);
      res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
      if (error.message === 'User already exists') {
        throw new BadRequestException('Username already taken');
      }
      throw error;
    }
  }

  @Post('login')
  async login(@Body('username') username: string, @Body('password') password: string, @Res() res: Response): Promise<any> {
    const isValid = await this.userService.validateUser(username, password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const user = await this.userService.findUserByUsername(username);
    if (user.postTestsCompleted) {
      return res.status(403).json({ message: 'You have completed the post-test and can no longer use the tool.' });
    }
    const token = this.userService.generateJwtToken(username);
    res.cookie('auth_token', token, { httpOnly: true, secure: false });

    await this.gamificationService.handleLogin(user._id as Types.ObjectId);

    // Trigger quiz generation on login
    const quizInfo = await this.quizService.handleLoginQuiz(user);
    return res.status(200).json({ message: 'Login successful', preTestsCompleted: user.preTestsCompleted, postTestsCompleted: user.postTestsCompleted, quizInfo });
  }

  @Post('logout')
  async logout(@Res() res: Response): Promise<any> {
    res.clearCookie('auth_token');
    return res.send({ message: 'Logout successful' });
  }

  @Get('profile')
  async profile(@Req() req: Request, @Res() res: Response): Promise<any> {
    const token = req.cookies['auth_token'];
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const decoded = this.userService.verifyJwtToken(token);
    if (!decoded) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    return res.status(200).json({ username: decoded.username });
  }

  @Get('pre-test-status')
  async getPreTestStatus(@Req() req: Request, @Res() res: Response): Promise<any> {
    const user = await this.userService.findUserByToken(req.cookies['auth_token']);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    return res.status(200).json({ preTestsCompleted: user.preTestsCompleted, preTestCount: user.preTestSubmissions.length });
  }

  @Post('complete-pre-test')
  async completePreTest(@Req() req: Request, @Res() res: Response): Promise<any> {
    const user = await this.userService.findUserByToken(req.cookies['auth_token']);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    if (user.preTestSubmissions.length < 1) {
      return res.status(400).json({ message: 'At least one pre-test submission is required to complete the process.' });
    }
    await this.userService.completePreTest(user._id.toString());
    return res.status(200).json({ message: 'Pre-test process completed successfully', preTestsCompleted: true });
  }

  @Post('pre-test')
  async submitPreTest(@Body('text') text: string, @Body('section') section: string, @Req() req: Request, @Res() res: Response): Promise<any> {
    const MIN_WORD_COUNT = 250;
    const MAX_WORD_COUNT = 1500;
    const wordCount = text.trim().split(/\s+/).length;

    if (wordCount < MIN_WORD_COUNT || wordCount > MAX_WORD_COUNT) {
      throw new BadRequestException(`Text must be between ${MIN_WORD_COUNT} and ${MAX_WORD_COUNT} words.`);
    }

    const user = await this.userService.findUserByToken(req.cookies['auth_token']);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    await this.userService.addPreTestSubmission(user._id.toString(), text, section);
    return res.status(200).json({ message: 'Pre-test submitted successfully' });
  }

  @Get('pre-test-sections')
  async getPreTestSections(@Req() req: Request, @Res() res: Response): Promise<any> {
    const user = await this.userService.findUserByToken(req.cookies['auth_token']);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const sections = await this.userService.getPreTestSections(user._id.toString());
    return res.status(200).json({ sections });
  }

  @Get('post-test-sections')
  async getPostTestSections(@Req() req: Request, @Res() res: Response): Promise<any> {
    const user = await this.userService.findUserByToken(req.cookies['auth_token']);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const sections = user.postTestSubmissions.map(submission => submission.section);
    return res.status(200).json({ sections });
  }

  @Post('post-test')
  async submitPostTest(@Body('text') text: string, @Body('section') section: string, @Req() req: Request, @Res() res: Response): Promise<any> {
    const MIN_WORD_COUNT = 250;
    const MAX_WORD_COUNT = 1500;
    const wordCount = text.trim().split(/\s+/).length;
    const currentDate = new Date();
    const enableDate = parseISO('2024-08-28');

    if (!isAfter(currentDate, enableDate)) {
      return res.status(400).json({ message: 'Post-tests can only be submitted after August 28th.' });
    }

    if (wordCount < MIN_WORD_COUNT || wordCount > MAX_WORD_COUNT) {
      throw new BadRequestException(`Text must be between ${MIN_WORD_COUNT} and ${MAX_WORD_COUNT} words.`);
    }

    const user = await this.userService.findUserByToken(req.cookies['auth_token']);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
      const updatedUser = await this.userService.addPostTestSubmission(user._id.toString(), text, section);
      if (updatedUser.postTestsCompleted) {
        res.clearCookie('auth_token');
      }
      return res.status(200).json({ message: 'Post-test submitted successfully', postTestsCompleted: updatedUser.postTestsCompleted });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('gamification')
  async getGamification(@Req() req: Request) {
    const userId = req.user._id;
    const user = await this.userService.findById(userId);
    return {
      xp: user.xp,
      level: user.level,
      badges: user.badges,
      achievements: user.achievements,
      daily_streak: user.daily_streak,
      weekly_streak: user.weekly_streak
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('reset-streaks')
  async resetStreaks(@Req() req: Request) {
    const userId = req.user._id;
    await this.gamificationService.resetStreaks(userId);
    return { message: 'Streaks reset' };
  }
}
