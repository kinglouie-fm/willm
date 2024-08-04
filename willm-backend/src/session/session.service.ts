import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Session } from './schema/session.schema';
import { User } from '../user/schema/user.schema';
import { UserService } from '../user/user.service';

@Injectable()
export class SessionService {
  constructor(
    @InjectModel(Session.name) private sessionModel: Model<Session>,
    @InjectModel(User.name) private userModel: Model<User>,
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService
  ) {}

  async getCurrentSession(userId: string): Promise<Session> {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Check if there's already a session for today
    let session = await this.sessionModel.findOne({
      user_id: new Types.ObjectId(userId),
      date_created: { $gte: startOfToday },
    });

    if (!session) {
      session = new this.sessionModel({
        user_id: new Types.ObjectId(userId),
        date_created: new Date(),
        issues: [],
        texts: []
      });
      const savedSession = await session.save();
      console.log('New Session Created:', savedSession);
      await this.userModel.findByIdAndUpdate(userId, { $push: { sessions: savedSession._id } });
      await this.userService.setDailyRequestsLeft(new Types.ObjectId(userId), 15);
    }

    return session;
  }

  async getSessionsByUserId(userId: string): Promise<Session[]> {
    const sessions = await this.sessionModel.find({ user_id: new Types.ObjectId(userId) }).sort({ date_created: -1 }).exec();
    return sessions;
  }
}