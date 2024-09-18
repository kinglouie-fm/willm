import { Controller, Post, Body, Res, UnauthorizedException, Get, Req, BadRequestException, UseGuards, Patch } from '@nestjs/common';
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

  // Register a new user
  @Post('register')
  async register(
    @Body('username') username: string,
    @Body('password') password: string,
    @Body('dataPrivacyConsent') dataPrivacyConsent: boolean,
    @Res() res: Response
  ): Promise<void> {
    // Check if the user has given data privacy consent
    if (!dataPrivacyConsent) {
      throw new UnauthorizedException('Data privacy consent is required.');
    }

    // Check if the username is already taken
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

  // Login a user
  @Post('login')
  async login(@Body('username') username: string, @Body('password') password: string, @Res() res: Response): Promise<any> {
    try {
      // Validate the user's credentials
      const isValid = await this.userService.validateUser(username, password);
      if (!isValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Check if the user has completed the post-test and can no longer use the tool
      const user = await this.userService.findUserByUsername(username);
      if (user.postTestsCompleted) {
        return res.status(403).json({ message: 'You have completed the post-test and can no longer use the tool.' });
      }

      // Generate a JWT token and set it as a cookie
      const token = this.userService.generateJwtToken(username);
      res.cookie('auth_token', token, { httpOnly: true, secure: false });
  
      await this.gamificationService.handleLogin(user._id as Types.ObjectId);
  
      // Trigger quiz generation on login
      const quizInfo = await this.quizService.handleLoginQuiz(user);
      return res.status(200).json({ message: 'Login successful', preTestsCompleted: user.preTestsCompleted, postTestsCompleted: user.postTestsCompleted, quizInfo });
    } catch (error) {
      console.error(error);
    }
  }

  // Logout a user
  @Post('logout')
  async logout(@Res() res: Response): Promise<any> {
    res.clearCookie('auth_token');
    return res.send({ message: 'Logout successful' });
  }

  // Get the user's profile
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

    const user = await this.userService.findUserByToken(token);
    return res.status(200).json({ 
      username: decoded.username, 
      language: user.language,
      correctionModel: user.correctionModel,
      furtherCorrectionModel: user.furtherCorrectionModel,
      scoreModel: user.scoreModel,
      reviewModel: user.reviewModel,
      dailyRequestsLeft: user.dailyRequestsLeft
    });
  }

  // Get the users' pre-test status (completed or not, number of submissions)
  @Get('pre-test-status')
  async getPreTestStatus(@Req() req: Request, @Res() res: Response): Promise<any> {
    const user = await this.userService.findUserByToken(req.cookies['auth_token']);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    return res.status(200).json({ preTestsCompleted: user.preTestsCompleted, preTestCount: user.preTestSubmissions.length });
  }

  // Get the users' post-test status (completed or not, number of submissions)
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

  // Submit a pre-test
  @Post('pre-test')
  async submitPreTest(@Body('text') text: string, @Body('section') section: string, @Req() req: Request, @Res() res: Response): Promise<any> {
    const MIN_WORD_COUNT = 270;
    const MAX_WORD_COUNT = 330;
    const wordCount = text.trim().split(/\s+/).length;

    // Check if the text has the correct word count
    if (wordCount < MIN_WORD_COUNT || wordCount > MAX_WORD_COUNT) {
      throw new BadRequestException(`Text must be between ${MIN_WORD_COUNT} and ${MAX_WORD_COUNT} words.`);
    }

    // Check if the user is authorized
    const user = await this.userService.findUserByToken(req.cookies['auth_token']);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    await this.userService.addPreTestSubmission(user._id.toString(), text, section);
    return res.status(200).json({ message: 'Pre-test submitted successfully' });
  }

  // Get the sections for a user's pre-test submissions
  @Get('pre-test-sections')
  async getPreTestSections(@Req() req: Request, @Res() res: Response): Promise<any> {
    const user = await this.userService.findUserByToken(req.cookies['auth_token']);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const sections = await this.userService.getPreTestSections(user._id.toString());
    return res.status(200).json({ sections });
  }

  // Get the sections for a user's post-test submissions
  @Get('post-test-sections')
  async getPostTestSections(@Req() req: Request, @Res() res: Response): Promise<any> {
    const user = await this.userService.findUserByToken(req.cookies['auth_token']);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const sections = user.postTestSubmissions.map(submission => submission.section);
    return res.status(200).json({ sections });
  }

  // Submit a post-test
  @Post('post-test')
  async submitPostTest(@Body('text') text: string, @Body('section') section: string, @Req() req: Request, @Res() res: Response): Promise<any> {
    const MIN_WORD_COUNT = 270;
    const MAX_WORD_COUNT = 330;
    const wordCount = text.trim().split(/\s+/).length;
    const currentDate = new Date();
    // Enable post-tests after September 7th, 2024
    const enableDate = parseISO('2024-09-07');

    if (!isAfter(currentDate, enableDate)) {
      return res.status(400).json({ message: 'Post-tests can only be submitted after August 28th.' });
    }

    // Check if the text has the correct word count
    if (wordCount < MIN_WORD_COUNT || wordCount > MAX_WORD_COUNT) {
      throw new BadRequestException(`Text must be between ${MIN_WORD_COUNT} and ${MAX_WORD_COUNT} words.`);
    }

    // Check if the user is authorized
    const user = await this.userService.findUserByToken(req.cookies['auth_token']);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Try to add the post-test submission
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

  // Get the user's gamification data
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

  // Reset the user's streaks
  @UseGuards(JwtAuthGuard)
  @Get('reset-streaks')
  async resetStreaks(@Req() req: Request) {
    const userId = req.user._id;
    await this.gamificationService.resetStreaks(userId);
    return { message: 'Streaks reset' };
  }

  // Update the user's language learning model data
  @UseGuards(JwtAuthGuard)
  @Patch('updateModel')
  async updateModel(
    @Body() body: any,
    @Req() req: Request,
    @Res() res: Response
  ): Promise<any> {
    const user = await this.userService.findUserByToken(req.cookies['auth_token']);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const updateData: any = {};

    // Update only the provided fields
    if (body.correctionModel) updateData.correctionModel = body.correctionModel;
    if (body.furtherCorrectionModel) updateData.furtherCorrectionModel = body.furtherCorrectionModel;
    if (body.scoreModel) updateData.scoreModel = body.scoreModel;
    if (body.reviewModel) updateData.reviewModel = body.reviewModel;

    if (Object.keys(updateData).length > 0) {
      await this.userService.updateUserModels(user._id as Types.ObjectId, updateData);
    }

    return res.status(200).json({ message: 'Model updated successfully' });
  }

  // Update the user's explanation language
  @UseGuards(JwtAuthGuard)
  @Patch('updateLanguage')
  async updateLanguage(
    @Body('language') language: string,
    @Req() req: Request,
    @Res() res: Response
  ): Promise<any> {
    const user = await this.userService.findUserByToken(req.cookies['auth_token']);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    await this.userService.updateUserLanguage(user._id as Types.ObjectId, language);

    return res.status(200).json({ message: 'Language updated successfully' });
  }
}
