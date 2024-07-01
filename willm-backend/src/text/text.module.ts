import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Text, TextSchema } from './schema/text.schema';
import { TextService } from './text.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Text.name, schema: TextSchema }]),
  ],
  providers: [TextService],
  exports: [TextService],
})
export class TextModule {}
