import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Section } from './schema/section.schema';

@Injectable()
export class SectionService {
  constructor(@InjectModel(Section.name) private sectionModel: Model<Section>) {}

  async addSection(userId: string, sectionData: any): Promise<Section> {
    const section = new this.sectionModel({
      ...sectionData,
      user_id: userId,
      date_created: new Date(),
    });
    return section.save();
  }

  async findSectionsByUserId(userId: string): Promise<Section[]> {
    return this.sectionModel.find({ user_id: userId }).exec();
  }

  async findSectionByPayload(userId: string, payload: string): Promise<Section | null> {
    return this.sectionModel.findOne({ user_id: userId, payload }).exec();
  }
}
