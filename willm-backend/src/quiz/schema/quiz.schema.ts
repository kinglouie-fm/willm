import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
class Question extends Document {
  @Prop({ required: true })
  question_id: string;

  @Prop({ required: true })
  question_type: string;

  @Prop({ required: true })
  question_text: string;

  @Prop()
  text: string;

  @Prop()
  correct_answer: string;

  @Prop()
  user_answer: string;

  @Prop()
  word: string;

  @Prop([String])
  options: string[];

  @Prop()
  sentence: string;

  @Prop()
  argument: string;

  @Prop([String])
  excerpts: string[];

  @Prop([String])
  sentences: string[];

  @Prop({ default: false })
  result: boolean;

  @Prop({ default: false })
  answered: boolean;
}

const QuestionSchema = SchemaFactory.createForClass(Question);

@Schema()
export class Quiz extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user_id: Types.ObjectId;

  @Prop({ required: true })
  quiz_id: string;

  @Prop({ required: true })
  date_created: Date;

  @Prop({ type: [QuestionSchema], default: [] })
  questions: Question[];

  @Prop({ default: false })
  skipped: boolean;

  @Prop({ default: false })
  completed: boolean;

  @Prop({ default: 0 })
  score: number;
}

export const QuizSchema = SchemaFactory.createForClass(Quiz);
