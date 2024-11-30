import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Types } from 'mongoose';

@Schema()
export class PostTest extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: ['post-test'] })
  testType: 'post-test';

  @Prop({ required: true, default: Date.now })
  startedAt: Date;

  @Prop({ default: null })
  completedAt?: Date; 

  @Prop({
    type: [String],
    required: true,
  })
  randomizedWritingElements: string[];

  @Prop([
    {
      questionId: { type: String, required: true },
      writingElement: { type: String, required: true },
      userAnswer: { type: [String], default: [] }, 
      isCorrect: { type: Boolean }, 
    },
  ])
  results: Array<{
    questionId: string;
    writingElement: string;
    userAnswer: string[];
    isCorrect?: boolean;
  }>;
}

export const PostTestSchema = SchemaFactory.createForClass(PostTest);
