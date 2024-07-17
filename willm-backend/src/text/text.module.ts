import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Text, TextSchema } from './schema/text.schema';
import { TextService } from './text.service';
import { QuestionModule } from '../question/question.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Text.name, schema: TextSchema }]),
    forwardRef(() => QuestionModule),
  ],
  providers: [TextService],
  exports: [TextService],
})
export class TextModule {}
