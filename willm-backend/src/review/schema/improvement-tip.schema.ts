import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export class ImprovementTip {
  @Prop({ type: [String], default: [] })
  improvements: string[];

  @Prop({ type: [String], default: [] })
  tips: string[];
}

export const ImprovementTipSchema = SchemaFactory.createForClass(ImprovementTip);
export type ImprovementTipDocument = ImprovementTip & Document;
