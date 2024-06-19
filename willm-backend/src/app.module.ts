import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CorrectionModule } from './correction/correction.module';

@Module({
  imports: [CorrectionModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
