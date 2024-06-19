import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CorrectionService } from './correction.service';
import { CorrectionController } from './correction.controller';

@Module({
  imports: [HttpModule],
  controllers: [CorrectionController],
  providers: [CorrectionService],
})
export class CorrectionModule {}
