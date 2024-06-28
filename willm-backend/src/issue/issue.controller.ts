import { Controller, Post, Body } from '@nestjs/common';
import { IssueService } from './issue.service';

@Controller('issue')
export class IssueController {
  constructor(private readonly issueService: IssueService) {}

  @Post()
  async addIssue(@Body('user_id') user_id: string, @Body() issueData: any): Promise<{ message: string }> {
    await this.issueService.addIssue(user_id, issueData);
    return { message: 'Issue added successfully' };
  }
}
