import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

class ImprovementTip {
  @Prop({ type: [String], default: [] })
  improvements: string[];

  @Prop({ type: [String], default: [] })
  tips: string[];
}

const ImprovementTipSchema = SchemaFactory.createForClass(ImprovementTip);

@Schema()
export class Review extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user_id: Types.ObjectId;

  @Prop({ required: true })
  date_created: Date;

  @Prop({
    type: {
      grammar_vocab: { type: ImprovementTipSchema, default: () => ({}) },
      organization: { type: ImprovementTipSchema, default: () => ({}) },
      coherence: { type: ImprovementTipSchema, default: () => ({}) },
      writingStyle: { type: ImprovementTipSchema, default: () => ({}) },
    },
    default: {},
  })
  review_data: {
    grammar_vocab: ImprovementTip;
    organization: ImprovementTip;
    coherence: ImprovementTip;
    writingStyle: ImprovementTip;
  };
}

export const ReviewSchema = SchemaFactory.createForClass(Review);
