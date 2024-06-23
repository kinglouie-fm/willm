import { Controller, Post, Body } from '@nestjs/common';
import { CorrectionService } from './correction.service';

@Controller('correct')
export class CorrectionController {
  constructor(private readonly correctionService: CorrectionService) {}

  @Post()
  async handleCorrection(@Body() body: { text: string }) {
    const initialResult = await this.correctionService.callPythonService(body.text, 'initial');
    const correctedText = initialResult.correctedText;

    // Send initial response back to the frontend
    return {
      mistakes: initialResult.mistakes,
      corrections: initialResult.corrections,
      explanations: initialResult.explanations,
      correctedText: correctedText
    };
  }

  @Post('further-correct')
  async handleFurtherCorrection(@Body() body: { text: string }) {
    const furtherResult = await this.correctionService.callPythonService(body.text, 'further');

    // Extract the responses for organization, coherence, and writing style
    return {
      organization: furtherResult.organization,
      coherence: furtherResult.coherence,
      writingStyle: furtherResult.writingStyle
    };
  }
}
