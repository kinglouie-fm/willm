import { Controller, Post, Req, UseGuards, Body } from '@nestjs/common';
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
    // const submissionCount = await this.textService.getSubmissionCount(userId);
    // if (submissionCount % 3 !== 0) {
    //   return {
    //     message: "Not generating questions for this submission",
    //   };
    // }

    const questions = await this.questionService.generateQuestions(userId);
    return questions;
  }

  @UseGuards(JwtAuthGuard)
  @Post('academic_sentence_correction')
  async academicSentenceCorrection(
    @Body('original_sentence') originalSentence: string,
    @Body('corrected_sentence') correctedSentence: string,
  ) {
    const evaluation = await this.questionService.evaluateAcademicSentence(originalSentence, correctedSentence);
    return evaluation;
  }
}
