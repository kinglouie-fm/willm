import { Controller, Post, Body, Get, Param, UseGuards, Req } from '@nestjs/common';
import { ScoreService } from './score.service';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Types } from 'mongoose';

@Controller('score')
export class ScoreController {
  constructor(private readonly scoreService: ScoreService) {}

  // Not needed for now since scores are generated from correction controller
  @UseGuards(JwtAuthGuard)
  @Post('generate')
  async generateScore(
    @Body() body: { text: string; section: string; textId: string, scoreModel: string },
    @Req() req: Request
  ) {
    const userId = req.user._id;
    const scoreData = await this.scoreService.generateScore(body.text, userId, body.section, new Types.ObjectId(body.textId), body.scoreModel);
    return scoreData;
  }

  // Not needed for now
  @UseGuards(JwtAuthGuard)
  @Get('sections')
  async getSections(@Req() req: Request) {
    const userId = req.user._id;
    const sections = await this.scoreService.getUniqueSections(userId);
    return sections;
  }

  // Request score comparison for a specific section
  @UseGuards(JwtAuthGuard)
  @Get('comparison/:section')
  async compareScores(@Param('section') section: string, @Req() req: Request) {
    const userId = req.user._id;
    const comparisonResult = await this.scoreService.compareScores(userId, section);
    return comparisonResult;
  }

  // Get scores for a specific user
  @UseGuards(JwtAuthGuard)
  @Get('user/:user_id')
  async getScores(@Param('user_id') user_id: string) {
    return this.scoreService.findScoresByUserId(user_id);
  }
}