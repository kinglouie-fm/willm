import { Controller, Post, Req, UseGuards } from '@nestjs/common';
import { QuestionService } from './question.service';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('question')
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}

  @UseGuards(JwtAuthGuard)
  @Post('generate')
  async generateQuestion(@Req() req: Request) {
    const userId = req.user._id;
    const questions = await this.questionService.generateQuestions(userId);
    return questions;
  }
}
