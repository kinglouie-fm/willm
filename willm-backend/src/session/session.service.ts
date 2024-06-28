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

    let session = await this.sessionModel.findOne({
      user_id: userId,
      date_created: { $gte: startOfToday },
    });

    if (!session) {
      session = new this.sessionModel({
        session_id: new Types.ObjectId().toString(),
        user_id: userId,
        date_created: new Date(),
        issues: [],
      });
      await session.save();
      await this.userModel.findByIdAndUpdate(userId, { $push: { sessions: session._id } });
    }

    return session;
  }

  async createSession(userId: string, sessionData: any): Promise<void> {
    const session = new this.sessionModel({
      session_id: new Types.ObjectId().toString(),
      user_id: userId,
      date_created: new Date(),
      ...sessionData,
    });
    await session.save();
    await this.userModel.findByIdAndUpdate(userId, { $push: { sessions: session._id } });
  }
}
