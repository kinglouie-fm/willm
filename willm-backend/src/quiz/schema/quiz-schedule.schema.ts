import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class QuizSchedule extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  user_id: Types.ObjectId;

  @Prop({ required: true })
  next_quiz_date: Date;
}

export const QuizScheduleSchema = SchemaFactory.createForClass(QuizSchedule);
