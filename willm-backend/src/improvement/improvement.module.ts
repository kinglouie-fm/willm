import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Improvement, ImprovementSchema } from './schema/improvement.schema';
import { ImprovementController } from './improvement.controller';
import { ImprovementService } from './improvement.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Improvement.name, schema: ImprovementSchema }])],
  controllers: [ImprovementController],
  providers: [ImprovementService],
  exports: [ImprovementService]
})
export class ImprovementModule {}
