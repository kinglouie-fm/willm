import { Controller, Post, UseGuards, Req, Body, Get } from '@nestjs/common';
import { QuizService } from './quiz.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request } from 'express';
import { Types } from 'mongoose';

@Controller('quiz')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  // Generate a quiz for a user
  @UseGuards(JwtAuthGuard)
  @Post('generate')
  async generateQuiz(@Req() req: Request) {
    const userId = req.user._id;
    return this.quizService.generateQuiz(userId);
  }

  // Submit an answer for a question
  @UseGuards(JwtAuthGuard)
  @Post('submit-answer')
  async submitAnswer(@Req() req: Request, @Body() body) {
    const userId = req.user._id;
    const { quizId, questionId, userAnswer } = body;
    return this.quizService.submitQuizAnswer(userId, quizId, questionId, userAnswer);
  }

  // Explain the answer for a question
  @UseGuards(JwtAuthGuard)
  @Post('explain-answer')
  async explainAnswer(@Req() req: Request, @Body() body) {
    const userId = req.user._id;
    const { quizId, questionId, userAnswer } = body;
    const explanation = await this.quizService.explainAnswer(userId, quizId, questionId, userAnswer);
    return explanation;
  }

  // Skip a quiz
  @UseGuards(JwtAuthGuard)
  @Post('skip')
  async skipQuiz(@Req() req: Request, @Body() body) {
    const userId = req.user._id;
    const { quizId } = body;
    const result = await this.quizService.markQuizAsSkipped(userId, quizId);
    return result;
  }

  // Mark a quiz as completed
  @UseGuards(JwtAuthGuard)
  @Post('complete')
  async completeQuiz(@Req() req: Request, @Body() body) {
    const userId = req.user._id;
    const { quizId } = body;
    const result = await this.quizService.markQuizAsCompleted(userId, quizId);
    return result;
  }

  // Check if a quiz is due and generate it if it is
  @UseGuards(JwtAuthGuard)
  @Get('check-quiz')
  async checkQuiz(@Req() req: Request) {
    const userId = req.user._id;
    const result = await this.quizService.checkAndGenerateQuizIfDue(userId);
    return result;
  }

  // Get today's quiz
  @UseGuards(JwtAuthGuard)
  @Get('get-todays-quiz')
  async getTodaysQuiz(@Req() req: Request) {
    const userId = req.user._id;
    const quiz = await this.quizService.getTodaysQuiz(userId);
    return quiz;
  }
}
