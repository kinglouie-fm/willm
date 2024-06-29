import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ImprovementService } from './improvement.service';

@Controller('improvement')
export class ImprovementController {
  constructor(private readonly improvementService: ImprovementService) {}

  @Post()
  async addImprovement(@Body('user_id') user_id: string, @Body() improvementData: any): Promise<{ message: string }> {
    await this.improvementService.addImprovement(user_id, improvementData);
    return { message: 'Improvement added successfully' };
  }

  @Get(':user_id')
  async getImprovements(@Param('user_id') user_id: string) {
    return this.improvementService.findImprovementsByUserId(user_id);
  }
}
