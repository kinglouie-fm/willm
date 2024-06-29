import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ScoreService } from './score.service';

@Controller('score')
export class ScoreController {
  constructor(private readonly scoreService: ScoreService) {}

  @Post()
  async addScore(@Body('user_id') user_id: string, @Body('section_id') section_id: string, @Body() scoreData: any): Promise<{ message: string }> {
    await this.scoreService.addScore(user_id, section_id, scoreData);
    return { message: 'Score added successfully' };
  }

  @Get(':user_id')
  async getScores(@Param('user_id') user_id: string) {
    return this.scoreService.findScoresByUserId(user_id);
  }
}
