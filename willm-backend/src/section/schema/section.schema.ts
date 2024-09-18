import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class Section extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user_id: Types.ObjectId;

  @Prop({ required: true })
  date_created: Date;

  @Prop({ required: true })
  payload: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Text' }] })
  texts: Types.ObjectId[];
}

export const SectionSchema = SchemaFactory.createForClass(Section);
