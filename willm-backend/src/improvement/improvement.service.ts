import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Improvement } from './schema/improvement.schema';

@Injectable()
export class ImprovementService {
  constructor(@InjectModel(Improvement.name) private improvementModel: Model<Improvement>) {}

  async addImprovement(userId: string, improvementData: any): Promise<Improvement> {
    const improvement = new this.improvementModel({
      ...improvementData,
      user_id: userId,
    });
    return improvement.save();
  }

  async findImprovementsByUserId(userId: string): Promise<Improvement[]> {
    return this.improvementModel.find({ user_id: userId }).exec();
  }
}
