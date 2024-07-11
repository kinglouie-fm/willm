import { Controller, Post, Req, UseGuards, Res } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReviewService } from './review.service';
import { Request, Response } from 'express';

@Controller('review')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @UseGuards(JwtAuthGuard)
  @Post('generate')
  async generateReview(@Req() req: Request, @Res() res: Response) {
    const userId = req.user._id;
    const reviewResult = await this.reviewService.generateReview(userId);
    return res.status(200).json(reviewResult);
  }
}
