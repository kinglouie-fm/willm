import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class Issue extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Section', required: true })
  section: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Session', required: true })
  session: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Text', required: true })
  text: Types.ObjectId;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  original_text: string;

  @Prop({ required: true })
  corrected_text: string;

  @Prop({ required: true })
  category: string;
}

export const IssueSchema = SchemaFactory.createForClass(Issue);
