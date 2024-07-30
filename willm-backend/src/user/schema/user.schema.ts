import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class User extends Document {
  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true })
  password: string;

  @Prop({ default: false })
  preTestsCompleted: boolean;

  @Prop({ type: [{ text: String, section: String }], default: [] })
  preTestSubmissions: { text: string, section: string }[];

  @Prop({ type: [{ text: String, section: String }], default: [] })
  postTestSubmissions: { text: string, section: string }[];

  @Prop({ default: false })
  postTestsCompleted: boolean;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Issue' }] })
  issues: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Session' }] })
  sessions: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Score' }] })
  scores: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Section' }] })
  sections: Types.ObjectId[];

  @Prop({ default: 0 })
  xp: number;

  @Prop({ default: 1 })
  level: number;

  @Prop({ type: [{ name: String, date: Date }], default: [] })
  badges: { name: string, date: Date }[];

  @Prop({ type: Object, default: { quizzes_completed: 0, correct_answers: 0, weekly_streaks: 0, consecutive_days: 1 } })
  achievements: {
    quizzes_completed: number;
    correct_answers: number;
    weekly_streaks: number;
    consecutive_days: number;
  };
  
  @Prop({ default: 1 })
  daily_streak: number;

  @Prop({ default: 0 })
  weekly_streak: number;

  @Prop({ default: Date.now })
  last_login: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
