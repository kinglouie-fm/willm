import { Controller, Post, Req, UseGuards, Body, Get } from '@nestjs/common';
import { QuestionService } from './question.service';
import { TextService } from '../text/text.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request } from 'express';

@Controller('question')
export class QuestionController {
  constructor(
    private readonly questionService: QuestionService,
    private readonly textService: TextService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('generate')
  async generateQuestion(@Req() req: Request) {
    // return {
    //   "message": "saving money, change back when needed"
    // }
    const userId = req.user._id;

    // Check submission count
    const submissionCount = await this.textService.getSubmissionCount(userId);
    if (submissionCount % 5 !== 0) {
      return {
        message: "Not generating questions for this submission",
      };
    }

    const questions = await this.questionService.generateQuestions(userId);
    return questions;
  }

  // @UseGuards(JwtAuthGuard)
  // @Post('academic_sentence_correction')
  // async academicSentenceCorrection(
  //   @Body('original_sentence') originalSentence: string,
  //   @Body('corrected_sentence') correctedSentence: string,
  // ) {
  //   const evaluation = await this.questionService.evaluateAcademicSentence(originalSentence, correctedSentence);
  //   return evaluation;
  // }

  // For testing purposes only
  @UseGuards(JwtAuthGuard)
  @Post('add')
  async addQuestion(@Body() data: any, @Req() req: Request) {
    const userId = '669d73dc7025c301e4c9a4c0';
    return this.questionService.addQuestionManually(data, userId);
  }

  // For testing purposes only
  @UseGuards(JwtAuthGuard)
  @Get('get')
  async getQuestions(@Req() req) {
    const userId = '669d73dc7025c301e4c9a4c0';
    return this.questionService.getQuestionsForUser(userId);
  }
}
