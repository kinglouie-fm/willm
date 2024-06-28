import { Controller, Post, Body } from '@nestjs/common';
import { SessionService } from './session.service';

@Controller('session')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post()
  async createSession(@Body('user_id') user_id: string, @Body() sessionData: any): Promise<{ message: string }> {
    await this.sessionService.createSession(user_id, sessionData);
    return { message: 'Session created successfully' };
  }
}
