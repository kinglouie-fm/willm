import { Controller, Post, Body } from '@nestjs/common';
import { IssueService } from './issue.service';

// This controller is responsible for handling issue requests
@Controller('issue')
export class IssueController {
  constructor(private readonly issueService: IssueService) {}

  // Add an issue to the database
  @Post()
  async addIssue(@Body('user_id') user_id: string, @Body() issueData: any): Promise<{ message: string }> {
    await this.issueService.addIssue(user_id, issueData);
    return { message: 'Issue added successfully' };
  }
}
