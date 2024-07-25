import { Injectable, UnauthorizedException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { User } from './schema/user.schema';

const JWT_SECRET = 'your_jwt_secret';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>
  ) {}

  async userExists(username: string): Promise<boolean> {
    const count = await this.userModel.countDocuments({ username });
    return count > 0;
  }

  async register(username: string, password: string): Promise<void> {
    const userExists = await this.userExists(username);
    if (userExists) {
      throw new Error('User already exists');
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new this.userModel({
      username,
      password: hashedPassword,
      preTestsCompleted: false,
      preTestSubmissions: [],
    });
    await newUser.save();
  }

  async validateUser(username: string, password: string): Promise<boolean> {
    const user = await this.userModel.findOne({ username });
    if (user && await bcrypt.compare(password, user.password)) {
      return true;
    }
    return false;
  }

  generateJwtToken(username: string): string {
    return jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
  }

  verifyJwtToken(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return null;
    }
  }

  async findUserByUsername(username: string): Promise<User> {
    return this.userModel.findOne({ username }).exec();
  }

  async findUserByToken(token: string): Promise<User> {
    const decoded = this.verifyJwtToken(token);
    if (!decoded) {
      throw new UnauthorizedException('Invalid token');
    }
    return this.findUserByUsername(decoded.username);
  }

  async addPreTestSubmission(userId: string, text: string, section: string): Promise<void> {
  const user = await this.userModel.findById(userId);
  user.preTestSubmissions.push({ text, section });
  if (user.preTestSubmissions.length >= 3) {
    user.preTestsCompleted = true;
  }
  await user.save();
}


  async completePreTest(userId: string): Promise<void> {
    const user = await this.userModel.findById(userId);
    user.preTestsCompleted = true;
    await user.save();
  }
}
