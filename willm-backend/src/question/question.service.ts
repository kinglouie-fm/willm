import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { TextService } from '../text/text.service';
import { Model, Types } from 'mongoose';
import { QuestionCount } from './schema/question-count.schema';
import { InjectModel } from '@nestjs/mongoose';
import { lastValueFrom } from 'rxjs';
import { IssueService } from '../issue/issue.service';

@Injectable()
export class QuestionService {
  private questionTypes = [
    'revision',
    'synonyms',
    'academic_sentence',
    'argument_strengthening',
    'coherence',
    'organization',
  ];
  private currentQuestionIndex = 0;

  constructor(
    private readonly httpService: HttpService,
    @Inject(forwardRef(() => TextService))
    private readonly textService: TextService,
    @InjectModel(QuestionCount.name) private questionCountModel: Model<QuestionCount>,
    @Inject(forwardRef(() => IssueService))
    private readonly issueService: IssueService,
  ) {}

  async generateQuestions(userId: Types.ObjectId) {
    const submissions = await this.textService.findLastSubmissions(userId, 5);

    const sectionTexts = submissions.reduce((acc, sub) => {
        if (!acc[sub.section]) {
            acc[sub.section] = [];
        }
        acc[sub.section].push(sub.content);
        return acc;
    }, {});

    const sections = Object.keys(sectionTexts);
    let combinedText = '';

    // Determine question type
    const lastThreeSubmissions = submissions.slice(0, 3).map(sub => sub.content).join(' ');
    const suggestedQuestionType = await this.suggestQuestionType(lastThreeSubmissions);
    const questionType = await this.selectQuestionType(suggestedQuestionType, userId);

    let textForQuestion = '';

    // Logic for different question types
    if (questionType === 'revision') {
        const revisionText = await this.findTextWithIssues(userId);
        if (revisionText) {
          textForQuestion = revisionText;
        } else {
          const firstSubmission = await this.textService.findLastSubmissions(userId, 1);
          textForQuestion = firstSubmission[0].content
        }
    } else if (['academic_sentence', 'synonyms', 'argument_strengthening'].includes(questionType)) {
        // Use only the last submission's text
        const lastSubmission = submissions[0];
        textForQuestion = `Section ${lastSubmission.section}\n${lastSubmission.content}`;
    } else if (['coherence', 'organization'].includes(questionType)) {
      if (sections.length >= 2) {
        // Use only the first text in each of two sections
        combinedText = sections.slice(0, 2).map(section => {
            const sectionContent = sectionTexts[section][0];
            return `Section ${section}\n${sectionContent}`;
        }).join('\n\n');
      } else {
        // Fallback: Collect the first two texts, regardless of their sections
        const firstTwoTexts = submissions.slice(0, 2);
        combinedText = firstTwoTexts.map((sub, index) => {
            return `Section ${sub.section}\n${sub.content}`;
        }).join('\n\n');
      }
      textForQuestion = combinedText;
    }

    console.log("Making request to flask-api for question generation");

    const response = await lastValueFrom(this.httpService.post('http://flask-api:8000/question/generate', {
        user_id: userId,
        type: questionType,
        text: textForQuestion,
    }));

    await this.updateQuestionCount(questionType);

    return response.data;
  }

  private async suggestQuestionType(lastThreeSubmissions: string): Promise<string> {
    console.log("Making request to flask-api for question type suggestion");
    const response = await lastValueFrom(this.httpService.post('http://flask-api:8000/question/suggest-type', { lastThreeSubmissions }));
    const questionType = response.data.type;
    return this.questionTypes.includes(questionType) ? questionType : null;
  }

  private async selectQuestionType(suggestedType: string, userId: Types.ObjectId): Promise<string> {
    if (suggestedType && await this.isBalanced(suggestedType)) {
      console.log(`Suggested question type ${suggestedType} is balanced`);
      return suggestedType;
    }
    
    let questionType = this.questionTypes[this.currentQuestionIndex];
    this.currentQuestionIndex = (this.currentQuestionIndex + 1) % this.questionTypes.length;

    // Check for coherence and organization specific conditions
    if (questionType === 'coherence' || questionType === 'organization') {
      const submissions = await this.textService.findLastSubmissions(userId, 5);
      const sectionTexts = submissions.reduce((acc, sub) => {
        if (!acc[sub.section]) {
          acc[sub.section] = [];
        }
        acc[sub.section].push(sub.content);
        return acc;
      }, {});
      const sections = Object.keys(sectionTexts);

      if (sections.length < 2) {
        console.log(`Skipping ${questionType} due to insufficient sections`);
        this.updateQuestionCount(questionType);

        // Add skipped question type to the front of the queue
        this.currentQuestionIndex = (this.currentQuestionIndex - 1 + this.questionTypes.length) % this.questionTypes.length;
        this.questionTypes.splice(this.currentQuestionIndex, 0, this.questionTypes.splice(this.questionTypes.indexOf(questionType), 1)[0]);

        return this.selectQuestionType(null, userId);
      }
    }

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

  private async findTextWithIssues(userId: Types.ObjectId): Promise<string | null> {
    const issues = await this.issueService.getLastIssuesByType(userId, 10);
    const grammarVocabIssues = issues.filter(issue => issue.type === 'grammar_vocab');
    const textsWithIssues = grammarVocabIssues.reduce((acc, issue) => {
      const textId = issue.text.toString();
      acc[textId] = (acc[textId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const textId = Object.keys(textsWithIssues).find(key => textsWithIssues[key] >= 3);
    if (textId) {
      const text = await this.textService.findTextById(new Types.ObjectId(textId));
      return text ? text.content : null;
    }
    return null;
  }

  // For testing purposes only
  async addQuestionManually(data: any, userId: string) {
    const response = await lastValueFrom(this.httpService.post('http://flask-api:8000/question/add', {
      user_id: userId,
      type: data.type,
      question: data.question,
      text: data.text,
      answer: data.answer,
      word: data.word,
      options: data.options,
      sentence: data.sentence,
      argument: data.argument,
      excerpts: data.excerpts,
      sentences: data.sentences,
    }));

    return response.data;
  }

  // For testing purposes only
  async getQuestionsForUser(userId: string) {
    const response = await lastValueFrom(this.httpService.get(`http://flask-api:8000/question/get/${userId}`));
    return response.data;
  }
}
