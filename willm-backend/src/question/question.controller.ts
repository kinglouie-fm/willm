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
    const submissionCount = await this.textService.getSubmissionCount(userId);
    if (submissionCount % 5 !== 0) {
      return {
        message: "Not generating questions for this submission",
      };
    }

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

  @UseGuards(JwtAuthGuard)
  @Post('explain-answer')
  async explainAnswer(
    @Body('question') question: string,
    @Body('correct_answer') correctAnswer: string,
    @Body('user_answer') userAnswer: string,
    @Body('options') options: string[],
    @Body('text') text?: string,
    @Body('word') word?: string,
    @Body('sentence') sentence?: string,
  ) {
    const explanation = await this.questionService.explainAnswer(question, correctAnswer, userAnswer, options, text, word, sentence);
    return explanation;
  }
}
