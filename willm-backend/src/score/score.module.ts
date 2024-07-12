import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { Score, ScoreSchema } from './schema/score.schema';
import { ScoreController } from './score.controller';
import { ScoreService } from './score.service';
import { UserModule } from 'src/user/user.module';
import { Section, SectionSchema } from '../section/schema/section.schema';
import { SectionService } from '../section/section.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Score.name, schema: ScoreSchema }, { name: Section.name, schema: SectionSchema }]),
    HttpModule,
    UserModule,
  ],
  controllers: [ScoreController],
  providers: [ScoreService, SectionService],
  exports: [ScoreService]
})
export class ScoreModule {}
