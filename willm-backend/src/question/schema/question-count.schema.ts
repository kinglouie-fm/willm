import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class QuestionCount extends Document {
  @Prop({ required: true, unique: true })
  questionType: string;

  @Prop({ required: true, default: 0 })
  count: number;
}

export const QuestionCountSchema = SchemaFactory.createForClass(QuestionCount);
