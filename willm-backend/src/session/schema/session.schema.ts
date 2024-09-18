import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class Session extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user_id: Types.ObjectId;

  @Prop({ required: true })
  date_created: Date;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Issue' }] })
  issues: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Text' }] })
  texts: Types.ObjectId[];
}

export const SessionSchema = SchemaFactory.createForClass(Session);
