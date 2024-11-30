import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { TestService } from './test.service';

@Controller('test')
export class TestController {
  constructor(private readonly testService: TestService) {}

  // Get or generate a pre-test/post-test
  @Get(':userId/:testType')
  async getTest(
    @Param('userId') userId: string,
    @Param('testType') testType: 'pre-test' | 'post-test',
  ) {
    return this.testService.getOrGenerateTest(userId, testType);
  }

  // Submit answers and complete a test
  @Post(':userId/:testId/complete')
  async completeTest(
    @Param('userId') userId: string,
    @Param('testId') testId: string,
    @Body() answers: Record<string, string[]>,
  ) {
    return this.testService.completeTest(userId, testId, answers);
  }
}
