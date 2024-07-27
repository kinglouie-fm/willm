import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class Quiz extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user_id: Types.ObjectId;

  @Prop({ required: true })
  quiz_id: string;

  @Prop({ required: true })
  date_created: Date;

  @Prop({ type: Array, default: [] })
  questions: {
    question_id: string;
    question_text: string;
    question_type: string;
    options: string[];
    correct_answer: string;
    user_answer: string;
    result: boolean;
  }[];

  @Prop({ required: true })
  interval_days: number;

  @Prop({ required: true })
  next_quiz_date: Date;
}

export const QuizSchema = SchemaFactory.createForClass(Quiz);
