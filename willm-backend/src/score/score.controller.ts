import { Controller, Post, Body, Get, Param, UseGuards, Req } from '@nestjs/common';
import { ScoreService } from './score.service';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Types } from 'mongoose';

@Controller('score')
export class ScoreController {
  constructor(private readonly scoreService: ScoreService) {}

  // not needed atm since scores are generated from correction controller
  @UseGuards(JwtAuthGuard)
  @Post('generate')
  async generateScore(
    @Body() body: { text: string; section: string; textId: string },
    @Req() req: Request
  ) {
    const userId = req.user._id;
    console.log('Generating score for user:', userId, 'section:', body.section, 'textId:', body.textId);
    const scoreData = await this.scoreService.generateScore(body.text, userId, body.section, new Types.ObjectId(body.textId));
    return scoreData;
  }

  @UseGuards(JwtAuthGuard)
  @Get('sections')
  async getSections(@Req() req: Request) {
    const userId = req.user._id;
    // console.log('Fetching unique sections for user:', userId);
    const sections = await this.scoreService.getUniqueSections(userId);
    // console.log('Fetched sections:', sections);
    return sections;
  }

  @UseGuards(JwtAuthGuard)
  @Get('comparison/:section')
  async compareScores(@Param('section') section: string, @Req() req: Request) {
    const userId = req.user._id;
    // console.log('Comparing scores for section:', section, 'user:', userId);
    const comparisonResult = await this.scoreService.compareScores(userId, section);
    return comparisonResult;
  }

  @UseGuards(JwtAuthGuard)
  @Get('user/:user_id')
  async getScores(@Param('user_id') user_id: string) {
    console.log('Fetching scores for user:', user_id);
    return this.scoreService.findScoresByUserId(user_id);
  }
}