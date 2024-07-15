import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class Score extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user_id: Types.ObjectId;

  @Prop({ required: true })
  section: string;

  @Prop({ required: true })
  grammar: number;

  @Prop({ required: true })
  vocabulary: number;

  @Prop({ required: true })
  organization: number;

  @Prop({ required: true })
  coherence: number;

  @Prop({ required: true })
  writing_style: number;

  @Prop({ required: true })
  date_created: Date;
}

export const ScoreSchema = SchemaFactory.createForClass(Score);
