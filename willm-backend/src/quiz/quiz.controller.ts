import { Controller, Post, UseGuards, Req, Body } from '@nestjs/common';
import { QuizService } from './quiz.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request } from 'express';

@Controller('quiz')
export class QuizController {
  constructor(private readonly quizService: QuizService) {}

  @UseGuards(JwtAuthGuard)
  @Post('generate')
  async generateQuiz(@Req() req: Request) {
    const userId = req.user._id;
    return this.quizService.generateQuiz(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('submit-answer')
  async submitAnswer(@Req() req: Request, @Body() body) {
    const userId = req.user._id;
    const { quizId, questionId, userAnswer } = body;
    return this.quizService.submitQuizAnswer(userId, quizId, questionId, userAnswer);
  }

  @UseGuards(JwtAuthGuard)
  @Post('skip')
  async skipQuiz(@Req() req: Request, @Body() body) {
    const userId = req.user._id;
    const { quizId } = body;
    await this.quizService.markQuizAsSkipped(userId, quizId);
    return { message: 'Quiz marked as skipped' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('complete')
  async completeQuiz(@Req() req: Request, @Body() body) {
    const userId = req.user._id;
    const { quizId } = body;
    await this.quizService.markQuizAsCompleted(userId, quizId);
    return { message: 'Quiz marked as completed' };
  }
}