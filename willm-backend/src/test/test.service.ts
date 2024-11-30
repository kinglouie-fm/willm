import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as fs from 'fs/promises';
import { join } from 'path';
import { PreTest } from './schema/pre-test.schema';

@Injectable()
export class TestService {
  private questions: Record<string, any>; // Questions loaded from the JSON file

  constructor(@InjectModel(PreTest.name) private readonly preTestModel: Model<PreTest>) {
    this.loadQuestions(); // Load questions at service initialization
  }

  // Load questions from the JSON file
  private async loadQuestions() {
    const filePath = join(__dirname, '..', 'assets', 'questions.json');
    try {
      const fileContent = await fs.readFile(filePath, 'utf8');
      this.questions = JSON.parse(fileContent);
    } catch (error) {
      console.error('Failed to load questions JSON file:', error);
      throw new Error('Could not load questions.');
    }
  }

  // Check if the pre-test is completed
  async checkPreTestCompletion(userId: string): Promise<boolean> {
    const preTest = await this.preTestModel.findOne({
      userId,
      testType: 'pre-test',
    }).exec();

    if (preTest?.completedAt) {
      return true; // Test completed
    }

    // If test is incomplete or doesn't exist, always generate a new one
    await this.getOrGenerateTest(userId, 'pre-test');
    return false;
  }

  // Always generate a new pre-test or post-test
  async getOrGenerateTest(userId: string, testType: 'pre-test' | 'post-test'): Promise<PreTest> {
    // Always remove existing incomplete test if any
    await this.preTestModel.deleteMany({ userId, testType, completedAt: null }).exec();

    // Generate new test
    const writingElements = Object.keys(this.questions);
    const randomizedOrder = [...writingElements].sort(() => Math.random() - 0.5);

    const testQuestions = randomizedOrder.flatMap((element) => {
      const exerciseTypes = Object.keys(this.questions[element]);
      return exerciseTypes.flatMap((type) =>
        this.questions[element][type].map((q: any) => ({
          questionId: q.questionId,
          writingElement: element,
        }))
      );
    });

    // Create and save a new test
    const newTest = new this.preTestModel({
      userId,
      testType,
      randomizedWritingElements: randomizedOrder,
      results: testQuestions,
    });

    return newTest.save();
  }

  // Complete a test and save the results
  async completeTest(userId: string, testId: string, answers: Record<string, string[]>): Promise<PreTest> {
    const test = await this.preTestModel.findById(testId).exec();

    if (!test || test.userId.toString() !== userId || test.completedAt) {
      throw new NotFoundException('Invalid or already completed test.');
    }

    // Evaluate answers
    test.results = test.results.map((result) => {
      const userAnswer = answers[result.questionId] || [];
      const question = this.findQuestionById(result.questionId);

      return {
        ...result,
        userAnswer,
        isCorrect: JSON.stringify(userAnswer.sort()) === JSON.stringify(question.correctAnswer.sort()),
      };
    });

    test.completedAt = new Date();
    return test.save();
  }

  // Helper to find a question by ID
  private findQuestionById(questionId: string) {
    for (const element of Object.values(this.questions)) {
      for (const type of Object.values(element)) {
        const question = (type as any[]).find((q) => q.questionId === questionId);
        if (question) {
          return question;
        }
      }
    }
    throw new NotFoundException(`Question with ID ${questionId} not found.`);
  }
}
