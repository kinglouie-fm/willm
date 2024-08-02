import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class Review extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user_id: Types.ObjectId;

  @Prop({ required: true })
  date_created: Date;

  @Prop({
    type: {
      grammar_vocab: { type: { improvements: [String], tips: [String] }, default: {} },
      organization: { type: { improvements: [String], tips: [String] }, default: {} },
      coherence: { type: { improvements: [String], tips: [String] }, default: {} },
      writingStyle: { type: { improvements: [String], tips: [String] }, default: {} },
    },
    default: {},
  })
  review_data: {
    grammar_vocab: { improvements: string[], tips: string[] },
    organization: { improvements: string[], tips: string[] },
    coherence: { improvements: string[], tips: string[] },
    writingStyle: { improvements: string[], tips: string[] },
  };

  @Prop({ type: String, default: '' })
  coherence_tip: string;

  @Prop({ type: String, default: '' })
  organization_tip: string;

  @Prop({ type: String, default: '' })
  reviewModel: string;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);
