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

  constructor(
    private readonly httpService: HttpService,
    @Inject(forwardRef(() => TextService))
    private readonly textService: TextService,
    @InjectModel(QuestionCount.name) private questionCountModel: Model<QuestionCount>,
    @Inject(forwardRef(() => IssueService))
    private readonly issueService: IssueService,
  ) {}

  // Generate questions for a user
  async generateQuestions(userId: Types.ObjectId) {
    const submissions = await this.textService.findLastSubmissions(userId, 5);

    // Retrieve the last three errors of type grammar_vocab
    const issues = await this.issueService.getLastIssuesByType(userId, 20);
    const grammarVocabIssues = issues
        .filter(issue => issue.type === 'grammar_vocab')
        .slice(0, 3);

    // Create a JSON string for grammar_vocab errors
    const errorsJson = JSON.stringify(
        grammarVocabIssues.map(issue => ({
            error: issue.original_text,
            category: issue.category,
        }))
    );

    // Store the text content for each section
    const sectionTexts = submissions.reduce((acc, sub) => {
        if (!acc[sub.section]) {
            acc[sub.section] = [];
        }
        acc[sub.section].push(sub.content);
        return acc;
    }, {});

    const sections = Object.keys(sectionTexts);
    let combinedText = '';

    const questionType = await this.getNextQuestionType(userId);
    console.log(`Selected question type: ${questionType}`);

    let textForQuestion = '';

    // Logic for different question types
    if (questionType === 'revision') {
      textForQuestion = errorsJson;
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

    // Make a request to the Flask API to generate the question
    const response = await lastValueFrom(this.httpService.post('http://flask-api:8031/question/generate', {
        user_id: userId,
        type: questionType,
        text: textForQuestion,
    }));

    return response.data;
  }

  private async getNextQuestionType(userId: Types.ObjectId): Promise<string> {
    // Retrieve the question count for the user
    const existingCount = await this.questionCountModel.findOne({}).exec();

    // If no count exists, start with 'revision'
    if (!existingCount) {
      await this.questionCountModel.create({ questionType: 'revision', count: 1 });
      return 'revision';
    }

    // Get the last generated question type
    const lastGenerated = existingCount.questionType;

    // Find the index of the last question type in the array
    const lastIndex = this.questionTypes.indexOf(lastGenerated);

    // Determine the next question type
    const nextIndex = (lastIndex + 1) % this.questionTypes.length;

    // Update the document with the new question type
    await this.questionCountModel.updateOne(
      { _id: existingCount._id },
      { $set: { questionType: this.questionTypes[nextIndex] } }
    );

    // Return the next question type
    return this.questionTypes[nextIndex];
  }

  // Evaluate a user submitted academic sentence correction
  async evaluateAcademicSentence(originalSentence: string, correctedSentence: string) {
    const response = await lastValueFrom(this.httpService.post('http://flask-api:8031/question/academic_sentence_correction', {
      original_sentence: originalSentence,
      corrected_sentence: correctedSentence,
    }));

    return response.data;
  }

  // For testing purposes only
  async addQuestionManually(data: any, userId: string) {
    const response = await lastValueFrom(this.httpService.post('http://flask-api:8031/question/add', {
      user_id: userId,
      type: data.type,
      question: data.question,
      text: data.text,
      answer: data.answer,
      word: data.word,
      options: data.options,
      sentence: data.sentence,
      argument: data.argument,
      scenario: data.scenario,
    }));

    return response.data;
  }

  // For testing purposes only
  async getQuestionsForUser(userId: string) {
    const response = await lastValueFrom(this.httpService.get(`http://flask-api:8031/question/get/${userId}`));
    return response.data;
  }
}
