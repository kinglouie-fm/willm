import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Types } from 'mongoose';

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

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Question' }] })
  question_pool: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Review' }] })
  review_pool: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Score' }] })
  scores: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Section' }] })
  sections: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Quiz' }] })
  recent_quiz_history: Types.ObjectId[];
}

export const UserSchema = SchemaFactory.createForClass(User);
