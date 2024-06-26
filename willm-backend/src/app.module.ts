import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CorrectionModule } from './correction/correction.module';
import { UserModule } from './user/user.module';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_CONNECTION_STRING), CorrectionModule, UserModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
