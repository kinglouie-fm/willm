import { Controller, Post, Body, Res, UnauthorizedException, Get, Req, BadRequestException, UseGuards, Patch } from '@nestjs/common';
import { Response, Request } from 'express';
import { UserService } from './user.service';
import { isAfter, parseISO } from 'date-fns';
import { QuizService } from '../quiz/quiz.service';
import { TestService } from '../test/test.service';
import { GamificationService } from '../gamification/gamification.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AllowedUsersGuard } from '../auth/allowed-users.guard';
import { Types } from 'mongoose';

@Controller('user')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly quizService: QuizService,
    private readonly gamificationService: GamificationService,
    private readonly testService: TestService
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

      // Generate a JWT token and set it as a cookie
      const token = this.userService.generateJwtToken(username);
      res.cookie('auth_token', token, { httpOnly: true, secure: false });

      await this.gamificationService.handleLogin(user._id as Types.ObjectId);

      // Check if the user has completed the pre-test
      const preTestCompleted = await this.testService.checkPreTestCompletion(user._id as Types.ObjectId);
      if (!preTestCompleted) {
        const preTest = await this.testService.getOrGenerateTest(user._id as Types.ObjectId, 'pre-test');
        return res.status(200).json({
          message: 'Login successful, please complete the pre-test.',
          preTestCompleted: false,
          preTest,
        });
      }

      // Check post-test completion
      const postTestCompleted = await this.testService.checkPostTestCompletion(user._id as Types.ObjectId);

      if (preTestCompleted && !isAfter(new Date(), new Date('2025-01-12'))) {
        // Trigger quiz generation on login
        const quizInfo = await this.quizService.handleLoginQuiz(user);
        return res.status(200).json({ 
          message: 'Login successful', 
          preTestCompleted: true, 
          postTestCompleted: false, 
          quizInfo });
      } else if (preTestCompleted && !postTestCompleted && isAfter(new Date(), new Date('2025-01-12'))) {
        const postTest = await this.testService.getOrGenerateTest(user._id as Types.ObjectId, 'post-test');
        return res.status(200).json({
          message: 'Login successful, please complete the post-test.',
          preTestCompleted: true,
          postTestCompleted: false,
          postTest,
        });
      } else if (preTestCompleted && postTestCompleted) {
        return res.status(403).json({
          message: 'Access revoked: You have completed the post-test and cannot access the tool.',
          preTestCompleted: true,
          postTestCompleted: true,
        });
      }
    } catch (error) {
      console.error(error);
    }
  }

  // Logout a user
  @Post('logout')
  async logout(@Res() res: Response): Promise<any> {
    res.clearCookie('auth_token');
    return res.status(200).send({ message: 'Logout successful' });
  }

  // Get the user's profile
  @UseGuards(JwtAuthGuard)
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

    const userId = req.user._id;
    const preTestCompleted = await this.testService.checkPreTestCompletion(userId);
    const postTestCompleted = await this.testService.checkPostTestCompletion(userId);

    const user = await this.userService.findUserByToken(token);
    return res.status(200).json({ 
      username: decoded.username, 
      language: user.language,
      correctionModel: user.correctionModel,
      furtherCorrectionModel: user.furtherCorrectionModel,
      scoreModel: user.scoreModel,
      reviewModel: user.reviewModel,
      dailyRequestsLeft: user.dailyRequestsLeft,
      preTestCompleted: preTestCompleted,
      postTestCompleted: postTestCompleted
    });
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

  // Get all users and their pre-test status
  @UseGuards(JwtAuthGuard, AllowedUsersGuard)
  @Get('pre-test-status/all')
  async getAllPreTestStatus(@Res() res: Response): Promise<any> {
    try {
      // Get all users
      const users = await this.userService.getAllUsers();

      // Map through each user and check pre-test status
      const preTestStatuses = await Promise.all(
        users.map(async (user) => {
          const existingTest = await this.testService.getTestIfExists(user._id as Types.ObjectId, 'pre-test');
          return {
            username: user.username,
            completedAt: existingTest?.completedAt || null,
          };
        })
      );

      return res.status(200).json(preTestStatuses);
    } catch (error) {
      console.error('Error fetching pre-test statuses:', error);
      return res.status(500).json({ message: 'Failed to retrieve pre-test statuses.' });
    }
  }

  // Get all users and their post-test status
  @UseGuards(JwtAuthGuard, AllowedUsersGuard)
  @Get('post-test-status/all')
  async getAllPostTestStatus(@Res() res: Response): Promise<any> {
    try {
      // Get all users
      const users = await this.userService.getAllUsers();

      // Map through each user and check post-test status
      const postTestStatuses = await Promise.all(
        users.map(async (user) => {
          const existingTest = await this.testService.getTestIfExists(user._id as Types.ObjectId, 'post-test');
          return {
            username: user.username,
            completedAt: existingTest?.completedAt || null,
          };
        })
      );

      return res.status(200).json(postTestStatuses);
    } catch (error) {
      console.error('Error fetching post-test statuses:', error);
      return res.status(500).json({ message: 'Failed to retrieve post-test statuses.' });
    }
  }
}
