import { Injectable, UnauthorizedException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { User } from './schema/user.schema';
import { ConfigService } from '@nestjs/config';

const JWT_SECRET = process.env.JWT_SECRET;

@Injectable()
export class UserService {
  private readonly jwtSecret: string;
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private configService: ConfigService,
  ) {
    this.jwtSecret = this.configService.get<string>('JWT_SECRET');
  }

  // Check if a user with the given username exists
  async userExists(username: string): Promise<boolean> {
    const count = await this.userModel.countDocuments({ username });
    return count > 0;
  }

  // Register a new user
  async register(username: string, password: string): Promise<void> {
    const userExists = await this.userExists(username);
    if (userExists) {
      throw new Error('User already exists');
    }

    // Hash the password before storing it
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new this.userModel({
      username,
      password: hashedPassword,
      preTestsCompleted: false,
      preTestSubmissions: [],
      postTestsCompleted: false,
      postTestSubmissions: [],
    });
    await newUser.save();
  }

  // Validate a user's credentials
  async validateUser(username: string, password: string): Promise<boolean> {
    const user = await this.userModel.findOne({ username });
    if (user && await bcrypt.compare(password, user.password)) {
      return true;
    }
    return false;
  }

  // Generate a JWT token for a user
  generateJwtToken(username: string): string {
    return jwt.sign({ username }, this.jwtSecret, { expiresIn: '1h' });
  }

  // Verify a JWT token
  verifyJwtToken(token: string): any {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (e) {
      return null;
    }
  }

  // Find a user by their username
  async findUserByUsername(username: string): Promise<User> {
    return this.userModel.findOne({ username }).exec();
  }

  // Find a user by their JWT token
  async findUserByToken(token: string): Promise<User> {
    const decoded = this.verifyJwtToken(token);
    if (!decoded) {
      throw new UnauthorizedException('Invalid token');
    }
    return this.findUserByUsername(decoded.username);
  }

  // Find a user by their ID
  async findById(userId: Types.ObjectId): Promise<User> {
    return this.userModel.findById(userId).exec();
  }

  // Add a pre-test submission for a user
  async addPreTestSubmission(userId: string, text: string, section: string): Promise<void> {
    const user = await this.userModel.findById(userId);
    user.preTestSubmissions.push({ text, section });
    if (user.preTestSubmissions.length >= 3) {
      user.preTestsCompleted = true;
    }
    await user.save();
  }

  // Mark a user's pre-tests as completed
  async completePreTest(userId: string): Promise<void> {
    const user = await this.userModel.findById(userId);
    user.preTestsCompleted = true;
    await user.save();
  }

  // Add a post-test submission for a user
  async addPostTestSubmission(userId: string, text: string, section: string): Promise<User> {
    const user = await this.userModel.findById(userId);
    const preTestSections = user.preTestSubmissions.map(submission => submission.section.trim().toLowerCase());
    const postTestSections = user.postTestSubmissions.map(submission => submission.section.trim().toLowerCase());

    const normalizedSection = section.trim().toLowerCase();

    // Ensure that the next section in post-test submissions matches the corresponding pre-test section
    if (postTestSections.length >= preTestSections.length || preTestSections[postTestSections.length] !== normalizedSection) {
      throw new Error('Section does not match the expected pre-test section order.');
    }

    user.postTestSubmissions.push({ text, section });

    if (user.postTestSubmissions.length >= user.preTestSubmissions.length) {
      user.postTestsCompleted = true;
    }

    await user.save();
    return user;
  }

  // Get the sections for a user's pre-test submissions
  async getPreTestSections(userId: string): Promise<string[]> {
    const user = await this.userModel.findById(userId);
    return user.preTestSubmissions.map(submission => submission.section);
  }

  // Update a user's language learning model data
  async updateUserModels(userId: Types.ObjectId, updateLLMData: any): Promise<void> {
    await this.userModel.updateOne(
      { _id: userId },
      { $set: updateLLMData }
    );
  }

  // Set the number of daily requests left for a user
  async setDailyRequestsLeft(userId: Types.ObjectId, dailyRequestsLeft: number): Promise<void> {
    await this.userModel.updateOne(
      { _id: userId },
      { $set: { dailyRequestsLeft } }
    );
  }

  // Get the number of daily requests left for a user
  async getDailyRequestsLeft(userId: Types.ObjectId): Promise<number> {
    const user = await this.userModel.findById(userId);
    return user.dailyRequestsLeft;
  }

  // Update a user's explanation language
  async updateUserLanguage(userId: Types.ObjectId, language: string): Promise<void> {
    await this.userModel.updateOne(
      { _id: userId },
      { $set: { language } }
    );
  }

  // Get all users
  async getAllUsers(): Promise<User[]> {
    return this.userModel.find({}, 'username preTestsCompleted postTestsCompleted').exec();
  }
}
