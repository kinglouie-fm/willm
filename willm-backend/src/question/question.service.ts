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

    // Determine question type by requesting a suggestion from the Flask API
    const lastThreeSubmissions = submissions.slice(0, 3).map(sub => sub.content).join(' ');
    // const suggestedQuestionType = await this.suggestQuestionType(lastThreeSubmissions);

    // Check if the suggested question type is balanced and store it if it is
    // const questionType = await this.selectQuestionType(suggestedQuestionType, userId);


    const questionType = await this.getNextQuestionType(userId);

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

    await this.updateQuestionCount(questionType);

    return response.data;
  }

  private async getNextQuestionType(userId: Types.ObjectId): Promise<string> {
    // Retrieve the question count for the user
    const counts = await this.questionCountModel.find({}).exec();

    // If there are no counts, start with 'revision'
    if (counts.length === 0) {
        await this.questionCountModel.create({ questionType: 'revision', count: 1 });
        return 'revision';
    }

    // Find the last generated question type
    const lastGenerated = counts[counts.length - 1].questionType;

    // Find the index of the last question type
    const lastIndex = this.questionTypes.indexOf(lastGenerated);

    // Determine the next question type
    const nextIndex = (lastIndex + 1) % this.questionTypes.length;
    return this.questionTypes[nextIndex];
  }

  // Suggest a question type based on the last three submissions
  private async suggestQuestionType(lastThreeSubmissions: string): Promise<string> {
    console.log("Making request to flask-api for question type suggestion");

    // Make a request to the Flask API to suggest a question type
    const response = await lastValueFrom(this.httpService.post('http://flask-api:8031/question/suggest-type', { lastThreeSubmissions }));
    const questionType = response.data.type;
    return this.questionTypes.includes(questionType) ? questionType : null;
  }

  // Select a question type based on the current round robin index
  private async selectQuestionType(suggestedType: string, userId: Types.ObjectId): Promise<string> {
    if (suggestedType && await this.isBalanced(suggestedType)) {
        console.log(`Suggested question type ${suggestedType} is balanced`);
        return suggestedType;
    }
    
    // Round robin through the question types
    while (true) {
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

        // Skip coherence and organization if there are not enough sections
        if (sections.length < 2) {
          console.log(`Skipping ${questionType} due to insufficient sections`);

          // Continue to the next question type without re-adding the current one
          continue;
        }
      }

      console.log(`Selected question type ${questionType} with round robin`);
      return questionType;
    }
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

  // Update the count of generated questions for a specific question type
  private async updateQuestionCount(questionType: string): Promise<void> {
    const existingCount = await this.questionCountModel.findOne({ questionType });

    if (existingCount) {
        // Increment the count for the question type
        await this.questionCountModel.updateOne(
            { questionType },
            { $inc: { count: 1 } }
        );
    } else {
        // Initialize the count for this question type
        await this.questionCountModel.create({ questionType, count: 1 });
    }
  }

  // Evaluate a user submitted academic sentence correction
  async evaluateAcademicSentence(originalSentence: string, correctedSentence: string) {
    const response = await lastValueFrom(this.httpService.post('http://flask-api:8031/question/academic_sentence_correction', {
      original_sentence: originalSentence,
      corrected_sentence: correctedSentence,
    }));

    return response.data;
  }

  // Find a text with at least 3 grammar/vocab issues
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
