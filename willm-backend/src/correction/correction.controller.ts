import { Controller, Post, Body } from '@nestjs/common';
import { CorrectionService } from './correction.service';

@Controller('correct')
export class CorrectionController {
  constructor(private readonly correctionService: CorrectionService) {}

  @Post()
  async handleCorrection(@Body() body: { text: string }) {
    const result = await this.correctionService.callPythonService(body.text);
    // const result = {
    //   result: 'Mistakes: ["present", "oversight", "achiving", "it`s"]\n' +
    //       'Corrections: ["presents", "oversights", "achieving", "its"]\n' +
    //       'Explanations: ["`Present` should be `presents` to agree with the singular subject `Mastering writing` (subject-verb agreement).", "`Oversight` should be plural `oversights` to match `occasional,` which implies more than one instance (noun number agreement).", "`Achiving` is a misspelling and should be `achieving` (correct spelling).", "`It"s` is a contraction of `it is` and should be `its` to indicate possession (possessive pronoun).]'
    // }
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
