import { Controller, Post, Body } from '@nestjs/common';
import { CorrectionService } from './correction.service';

@Controller('correct')
export class CorrectionController {
  constructor(private readonly correctionService: CorrectionService) {}

  @Post()
  async handleCorrection(@Body() body: { text: string }) {
    // const result = await this.correctionService.callPythonService(body.text);
    const result = {
  result: 'Mistakes: [I is]\n' +
    'Corrections: [I am]\n' +
    'Explanations: [The subject "I" requires the verb "am" to form the correct subject-verb agreement in the present tense. The correct first-person singular form of the verb "to be" is "am", not "is".]'
}
    console.log(result);

    // Regular expressions to match content between brackets
    const mistakesMatch = result.result.match(/Mistakes:\s*\[(.*?)\]/);
    const correctionsMatch = result.result.match(/Corrections:\s*\[(.*?)\]/);
    const explanationsMatch = result.result.match(/Explanations:\s*\[(.*?)\]/);

    // Extracting content between brackets
    const mistakes = mistakesMatch ? mistakesMatch[1].split(',').map(item => item.trim().replace(/^"|"$/g, '')) : [];
    const corrections = correctionsMatch ? correctionsMatch[1].split(',').map(item => item.trim().replace(/^"|"$/g, '')) : [];
    const explanations = explanationsMatch ? explanationsMatch[1].split(',').map(item => item.trim().replace(/^"|"$/g, '')) : [];

    // Constructing the response object
    const response = {
      mistakes,
      corrections,
      explanations
    };

    return response;
  }
}
