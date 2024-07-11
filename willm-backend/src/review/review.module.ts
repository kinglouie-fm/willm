import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Issue, IssueSchema } from '../issue/schema/issue.schema';
import { Review, ReviewSchema } from './schema/review.schema';
import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';
import { IssueService } from '../issue/issue.service';
import { Session, SessionSchema } from '../session/schema/session.schema';
import { SessionService } from '../session/session.service';
import { User, UserSchema } from '../user/schema/user.schema';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Issue.name, schema: IssueSchema }]),
    MongooseModule.forFeature([{ name: Review.name, schema: ReviewSchema }]),
    MongooseModule.forFeature([{ name: Session.name, schema: SessionSchema }]),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    forwardRef(() => UserModule),
  ],
  controllers: [ReviewController],
  providers: [ReviewService, IssueService, SessionService],
})
export class ReviewModule {}
