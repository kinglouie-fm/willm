import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Section, SectionSchema } from './schema/section.schema';
import { SectionController } from './section.controller';
import { SectionService } from './section.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Section.name, schema: SectionSchema }])],
  controllers: [SectionController],
  providers: [SectionService],
  exports: [SectionService]
})
export class SectionModule {}
