import { Controller, Post, Body } from '@nestjs/common';
import { CorrectionService } from './correction.service';

@Controller('/correct')
export class CorrectionController {
  constructor(private readonly correctionService: CorrectionService) {}

  @Post()
  async handleCorrection(@Body() body: { text: string }) {
    const result = await this.correctionService.callPythonService(body.text);
    return result;
  }
}
