import { Controller, Post, Body, Get, Param, UseGuards, Req } from '@nestjs/common';
import { ScoreService } from './score.service';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('score')
export class ScoreController {
  constructor(private readonly scoreService: ScoreService) {}

  @UseGuards(JwtAuthGuard)
  @Post('generate')
  async generateScore(
    @Body() body: { text: string; section: string }, 
    @Req() req: Request
  ) {
    const userId = req.user._id;
    const scoreData = await this.scoreService.generateScore(body.text, userId, body.section);
    return scoreData;
  }

  @Post()
  async addScore(
    @Body('user_id') user_id: string, 
    @Body('section_id') section_id: string, 
    @Body() scoreData: any
  ): Promise<{ message: string }> {
    await this.scoreService.addScore(user_id, section_id, scoreData);
    return { message: 'Score added successfully' };
  }

  @Get(':user_id')
  async getScores(@Param('user_id') user_id: string) {
    return this.scoreService.findScoresByUserId(user_id);
  }
}
