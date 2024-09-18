import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GamificationService } from './gamification.service';
import { UserModule } from '../user/user.module';
import { User, UserSchema } from '../user/schema/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    forwardRef(() => UserModule),
  ],
  providers: [GamificationService],
  exports: [GamificationService],
})
export class GamificationModule {}