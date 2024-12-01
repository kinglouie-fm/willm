import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as fs from 'fs/promises';
import { join } from 'path';
import { PreTest } from './schema/pre-test.schema';
import { PostTest } from './schema/post-test.schema';

@Injectable()
export class TestService {
  private questions: Record<string, any>; // Questions loaded from the JSON file

  constructor(
    @InjectModel(PreTest.name) private readonly preTestModel: Model<PreTest>,
    @InjectModel(PostTest.name) private readonly postTestModel: Model<PostTest>
  ) {
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
      return true;
    }

    // If test is incomplete or doesn't exist, always generate a new one
    await this.getOrGenerateTest(userId, 'pre-test');
    return false;
  }

  // Check if the post-test is completed
  async checkPostTestCompletion(userId: string): Promise<boolean> {
    const postTest = await this.postTestModel.findOne({
      userId,
      testType: 'post-test',
    }).exec();

    if (postTest && postTest.completedAt) {
      return true; // Test completed
    }

    if (postTest) {
      return false; // Test exists but not completed
    }

    // No test exists
    return false;
  }

  // Always generate a new pre-test or post-test
  async getOrGenerateTest(userId: string, testType: 'pre-test' | 'post-test'): Promise<PreTest | PostTest> {
    const TestModel: Model<PreTest | PostTest> = 
      testType === 'pre-test' ? this.preTestModel : this.postTestModel;

    const existingTest = await TestModel.findOne({ userId, testType, completedAt: null }).exec();
    if (existingTest) {
      return existingTest;
    }

    const writingElements = Object.keys(this.questions);
    const randomizedOrder = [...writingElements].sort(() => Math.random() - 0.5);

    const testQuestions = [];
    for (const element of randomizedOrder) {
      const exerciseTypes = Object.keys(this.questions[element]);
      for (const type of exerciseTypes) {
        const questions = this.questions[element][type];
        questions.forEach((q: any) => {
          testQuestions.push({
            questionId: q.questionId,
            writingElement: element,
          });
        });
      }
    }

    const newTest = new TestModel({
      userId,
      testType,
      randomizedWritingElements: randomizedOrder,
      results: testQuestions,
    });

    return newTest.save();
  }

  private getTestModel(testType: 'pre-test' | 'post-test'): Model<PreTest | PostTest> {
    return testType === 'pre-test' ? this.preTestModel : this.postTestModel;
  }

  // Complete a test and save the results
  async completeTest(userId: string, testId: string, answers: Record<string, string[]>, testType: 'pre-test' | 'post-test'): Promise<PreTest | PostTest> {
    // Dynamically select the model based on test type
    const TestModel = this.getTestModel(testType);

    // Find the test
    const test = await TestModel.findById(testId).exec();

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

    // Mark the test as completed
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
