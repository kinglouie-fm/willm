import { Controller, Post, Get, Req, UseGuards, Res, Body } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReviewService } from './review.service';
import { Request, Response } from 'express';

@Controller('review')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  // Generate a review
  @UseGuards(JwtAuthGuard)
  @Post('generate')
  async generateReview(@Req() req: Request, @Res() res: Response, @Body() body: { reviewModel: string }) {
    const userId = req.user._id;
    const reviewResult = await this.reviewService.generateReview(userId, body.reviewModel);
    return res.status(200).json(reviewResult);
  }

  // Get the most recent review
  @UseGuards(JwtAuthGuard)
  @Get('recent')
  async getRecentReview(@Req() req: Request, @Res() res: Response) {
    const userId = req.user._id;
    const recentReview = await this.reviewService.getRecentReview(userId);
    return res.status(200).json(recentReview);
  }
}
