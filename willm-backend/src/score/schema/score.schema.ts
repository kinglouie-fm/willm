import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class Score extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user_id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Section', required: true })
  section_id: Types.ObjectId;

  @Prop({ required: true })
  score: number;

  @Prop({ required: true })
  date_created: Date;
}

export const ScoreSchema = SchemaFactory.createForClass(Score);
