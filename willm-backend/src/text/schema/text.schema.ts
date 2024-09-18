import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Text extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Session', required: true })
  session_id: Types.ObjectId;

  @Prop({ required: true })
  section: string;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true })
  mode: string;

  @Prop({ required: true })
  language: string;

  @Prop({ required: true })
  correctionModel: string;

  @Prop({ required: true })
  furtherCorrectionModel: string;

  @Prop({ required: true })
  scoreModel: string;
}

export const TextSchema = SchemaFactory.createForClass(Text);

// Add an index on createdAt to optimize sorting
TextSchema.index({ createdAt: -1 });
