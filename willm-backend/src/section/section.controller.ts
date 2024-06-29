import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { SectionService } from './section.service';

@Controller('section')
export class SectionController {
  constructor(private readonly sectionService: SectionService) {}

  @Post()
  async addSection(@Body('user_id') user_id: string, @Body() sectionData: any): Promise<{ message: string }> {
    await this.sectionService.addSection(user_id, sectionData);
    return { message: 'Section added successfully' };
  }

  @Get(':user_id')
  async getSections(@Param('user_id') user_id: string) {
    return this.sectionService.findSectionsByUserId(user_id);
  }
}
