import { Controller, Get, Post, Body, Req, UseGuards, Param } from '@nestjs/common';
import { TestService } from './test.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request } from 'express';

@Controller('test')
@UseGuards(JwtAuthGuard)
export class TestController {
  constructor(private readonly testService: TestService) {}

  // Get or generate a pre-test/post-test
  @Get(':testType')
  async getTest(
    @Req() req: Request,
    @Param('testType') testType: 'pre-test' | 'post-test'
  ) {
    const userId = req.user._id;
    return this.testService.getOrGenerateTest(userId.toString(), testType);
  }

  // Submit answers and complete a test
  @Post(':testId/:testType/complete')
  async completeTest(
    @Req() req: Request,
    @Param('testId') testId: string,
    @Param('testType') testType: 'pre-test' | 'post-test',
    @Body() answers: Record<string, string[]>
  ) {
    const userId = req.user._id;
    return this.testService.completeTest(userId.toString(), testId, answers, testType);
  }
}
