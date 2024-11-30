import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TestService } from './test.service';
import { TestController } from './test.controller';
import { PreTest, PreTestSchema } from './schema/pre-test.schema';
import { PostTest, PostTestSchema } from './schema/post-test.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PreTest.name, schema: PreTestSchema },
      { name: PostTest.name, schema: PostTestSchema },
    ]),
  ],
  controllers: [TestController],
  providers: [TestService],
  exports: [TestService],
})
export class TestModule {}
