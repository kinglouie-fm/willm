import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class Text extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Session', required: true })
  session_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Section', required: true })
  section_id: Types.ObjectId;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true })
  mode: string;

  @Prop({ required: true })
  language: string;
}

export const TextSchema = SchemaFactory.createForClass(Text);
