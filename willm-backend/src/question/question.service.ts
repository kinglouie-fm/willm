import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { TextService } from '../text/text.service';
import { Model, Types } from 'mongoose';
import { QuestionCount } from './schema/question-count.schema';
import { InjectModel } from '@nestjs/mongoose';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class QuestionService {
  private questionTypes = [
    'revision',
    'synonyms',
    'academic_sentence',
    'argument_strengthening',
  ];
  private currentQuestionIndex = 0;

  constructor(
    private readonly httpService: HttpService,
    // TODO: not sure if this is good practice
    @Inject(forwardRef(() => TextService))
    private readonly textService: TextService,
    @InjectModel(QuestionCount.name) private questionCountModel: Model<QuestionCount>,
  ) {}

  async generateQuestions(userId: Types.ObjectId) {
    const submissions = await this.textService.findLastSubmissions(userId, 3);

    if (submissions.length < 3) {
      throw new Error('Not enough submissions to generate questions');
    }

    const combinedText = submissions.map(sub => sub.content).join(' ');
    const lastSubmission = submissions[0].content;
    console.log(`Last submission: ${lastSubmission}`);

    const suggestedQuestionType = await this.suggestQuestionType(combinedText);

    const questionType = await this.selectQuestionType(suggestedQuestionType);

    console.log("Making request to flask-api for question generation");

    const response = await lastValueFrom(this.httpService.post('http://flask-api:8000/question/generate', {
      type: questionType,
      lastSubmission: lastSubmission,
    }));

    await this.updateQuestionCount(questionType);

    return response.data;
  }

  private async suggestQuestionType(text: string): Promise<string> {
    console.log("Making request to flask-api for question type suggestion")
    const response = await lastValueFrom(this.httpService.post('http://flask-api:8000/question/suggest-type', { text }));
    const questionType = response.data.type;
    return this.questionTypes.includes(questionType) ? questionType : null;
  }

  private async selectQuestionType(suggestedType: string): Promise<string> {
    if (suggestedType && await this.isBalanced(suggestedType)) {
      console.log(`Suggested question type ${suggestedType} is balanced`);
      return suggestedType;
    }
    const questionType = this.questionTypes[this.currentQuestionIndex];
    this.currentQuestionIndex = (this.currentQuestionIndex + 1) % this.questionTypes.length;
    console.log(`Selected question type ${questionType} with round robin`);
    return questionType;
  }

  // checks if question type's generation count is within a balanced range by comparing it to the average count 
  // of all question types plus a threshold.
  private async isBalanced(questionType: string): Promise<boolean> {
    const counts = await this.questionCountModel.find().exec();
    const totalGenerated = counts.reduce((a, b) => a + b.count, 0);
    const average = totalGenerated / this.questionTypes.length;
    const threshold = 1;
    const typeCount = counts.find(count => count.questionType === questionType);
    return typeCount ? typeCount.count <= average + threshold : true;
  }

  private async updateQuestionCount(questionType: string): Promise<void> {
    await this.questionCountModel.findOneAndUpdate(
      { questionType },
      { $inc: { count: 1 } },
      { upsert: true, new: true },
    );
  }

  async evaluateAcademicSentence(originalSentence: string, correctedSentence: string) {
    const response = await lastValueFrom(this.httpService.post('http://flask-api:8000/question/academic_sentence_correction', {
      original_sentence: originalSentence,
      corrected_sentence: correctedSentence,
    }));

    return response.data;
  }
}
