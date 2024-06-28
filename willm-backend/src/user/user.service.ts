import { Injectable, UnauthorizedException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { User } from './schema/user.schema';
import { Session } from '../session/schema/session.schema';
import { SessionService } from '../session/session.service';

const JWT_SECRET = 'your_jwt_secret';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @Inject(forwardRef(() => SessionService))
    private readonly sessionService: SessionService
  ) {}

  async register(username: string, password: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new this.userModel({
      username,
      password: hashedPassword,
      issues: [],
      improvements: [],
      sessions: [],
      question_pool: [],
      review_pool: [],
      scores: [],
      sections: [],
      recent_quiz_history: []
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

  async handleUserLogin(username: string, password: string): Promise<{ token: string, session: Session }> {
    const isValid = await this.validateUser(username, password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const user = await this.userModel.findOne({ username });
    const token = this.generateJwtToken(username);
    const session = await this.sessionService.getCurrentSession(user._id.toString());
    return { token, session };
  }
}
