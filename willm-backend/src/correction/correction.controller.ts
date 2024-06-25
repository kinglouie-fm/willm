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
  //   return {
  //     "mistakes": [
  //         "Mastering writing present",
  //         "despite occasional oversight",
  //         "achiving proficiency",
  //         "due to its complexity"
  //     ],
  //     "corrections": [
  //         "Mastering writing presents",
  //         "despite the occasional oversight",
  //         "achieving proficiency",
  //         "due to its complexity"
  //     ],
  //     "explanations": [
  //         "The verb present should agree with the subject mastering writing in number. Since mastering writing is singular, the verb should be presents.",
  //         "The use of the before occasional oversight is more appropriate as it refers to a specific oversight, i.e., of the critical role of writing proficiency.",
  //         "This is a spelling error. The correct spelling is achieving.",
  //         "Its is a contraction of it is or it has, but its is a possessive adjective. The correct word here is its, showing possession of complexity."
  //     ],
  //     "correctedText": "Mastering writing presents a significant challenge for learners, despite the occasional oversight regarding the critical role of writing proficiency for students. In particular, achieving proficiency in academic writing, which is one of the most important genres of writing, proves difficult for many due to its complexity and the necessity for engaging in both critical thinking and high-quality writing techniques."
  // }
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
