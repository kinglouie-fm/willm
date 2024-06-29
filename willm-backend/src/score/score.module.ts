import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Score, ScoreSchema } from './schema/score.schema';
import { ScoreController } from './score.controller';
import { ScoreService } from './score.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Score.name, schema: ScoreSchema }])],
  controllers: [ScoreController],
  providers: [ScoreService],
  exports: [ScoreService]
})
export class ScoreModule {}
