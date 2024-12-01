import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as fs from 'fs/promises';
import { join } from 'path';
import { PreTest } from './schema/pre-test.schema';
import { PostTest } from './schema/post-test.schema';

@Injectable()
export class TestService {
  private questions: Record<string, any>;

  constructor(
    @InjectModel(PreTest.name) private readonly preTestModel: Model<PreTest>,
    @InjectModel(PostTest.name) private readonly postTestModel: Model<PostTest>
  ) {
    this.loadQuestions(); // Load questions at service initialization
  }

  // Load questions from the JSON file
  private async loadQuestions() {
    const filePath = join(__dirname, '..', '..', 'src', 'assets', 'test-questions.json');
    try {
      const fileContent = await fs.readFile(filePath, 'utf8');
      const parsed = JSON.parse(fileContent);

      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error("Invalid JSON structure: 'questions' key not found or not an array.");
      }

      this.questions = parsed;
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

  private getTestModel(testType: 'pre-test' | 'post-test'): Model<PreTest | PostTest> {
    return testType === 'pre-test' ? this.preTestModel : this.postTestModel;
  }

  // Always generate a new pre-test or post-test
  async getOrGenerateTest(userId: string, testType: 'pre-test' | 'post-test'): Promise<any> {
    const TestModel = this.getTestModel(testType);

    const existingTest = await TestModel.findOne({ userId, testType, completedAt: null }).exec();
    if (existingTest) {
      // Add question details to the response
      const resultsWithDetails = existingTest.results.map(result => {
        const questionDetails = this.findQuestionById(result.questionId); // Find question details
        return {
          ...result,
          ...questionDetails,
        };
      });

      // Return existing test with question details
      return {
        ...existingTest.toJSON(), 
        results: resultsWithDetails, 
      };
    }

    // Generate a new test if none exists
    const writingElements = Array.from(new Set(this.questions.questions.map(q => q.writingElement)));
    const randomizedOrder = [...writingElements].sort(() => Math.random() - 0.5);

    const testQuestions = [];
    for (const element of randomizedOrder) {
      const elementQuestions = this.questions.questions.filter(q => q.writingElement === element);
      elementQuestions.forEach((q) => {
        testQuestions.push({
          questionId: q.questionId,
          writingElement: q.writingElement,
          ...q, 
        });
      });
    }

    const newTest = new TestModel({
      userId,
      testType,
      randomizedWritingElements: randomizedOrder,
      results: testQuestions,
    });

    const savedTest = await newTest.save();

    // Add question details before returning
    const resultsWithDetails = savedTest.results.map(result => {
      const questionDetails = this.findQuestionById(result.questionId);
      return {
        ...result,
        ...questionDetails,
      };
    });

    return {
      ...savedTest.toJSON(),
      results: resultsWithDetails,
    };
  }

  // Complete a test and save the results
  async completeTest(userId: string, testId: string, answers: Record<string, string | string[]>, testType: 'pre-test' | 'post-test'): Promise<PreTest | PostTest> {
    // Dynamically select the model based on test type
    const TestModel = this.getTestModel(testType);

    // Find the test
    const test = await TestModel.findById(testId).exec();

    // Check if the test exists and is valid
    if (!test) {
        throw new NotFoundException('Test not found.');
    }

    if (test.userId.toString() !== userId) {
        throw new NotFoundException('You are not authorized to complete this test.');
    }

    if (test.completedAt) {
        throw new NotFoundException('Test has already been completed.');
    }

    // Evaluate answers
    test.results = test.results.map((result) => {
        let userAnswer = answers[result.questionId];

        // Normalize userAnswer to an array
        if (typeof userAnswer === 'string') {
            userAnswer = [userAnswer];
        } else if (!Array.isArray(userAnswer)) {
            userAnswer = [];
        }

        const question = this.findQuestionById(result.questionId);

        // Ensure answers are sorted and compared
        return {
            ...result,
            userAnswer: userAnswer.filter(Boolean), // Remove empty or null values
            isCorrect: JSON.stringify(userAnswer.sort()) === JSON.stringify(question.correctAnswer.sort()),
        };
    });

    // Mark the test as completed
    test.completedAt = new Date();
    return test.save();
  }

  // Helper to find a question by ID
  private findQuestionById(questionId: string) {
    const question = this.questions.questions.find(q => q.questionId === questionId);
    if (!question) {
      throw new NotFoundException(`Question with ID ${questionId} not found.`);
    }
    return question;
  }

  async getTestIfExists(userId: string, testType: 'pre-test' | 'post-test') {
    const TestModel = this.getTestModel(testType);
    return await TestModel.findOne({ userId, testType }).exec();
  }
}
