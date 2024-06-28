import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { CorrectionService } from './correction.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IssueService } from '../issue/issue.service';
import { Request } from 'express';

@Controller('correct')
export class CorrectionController {
  constructor(
    private readonly correctionService: CorrectionService,
    private readonly issueService: IssueService
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async handleCorrection(@Body() body: { text: string }, @Req() req: Request) {
    const initialResult = await this.correctionService.callPythonService(body.text, 'initial');
    const correctedText = initialResult.correctedText;

    // Ensure these fields are always arrays
    const mistakes = initialResult.mistakes || [];
    const corrections = initialResult.corrections || [];
    const explanations = initialResult.explanations || [];

    const userId = req.user._id;

    // Create and save issues in the database with type 'grammar_vocab'
    for (let i = 0; i < mistakes.length; i++) {
      await this.issueService.addIssue(userId, {
        section: "some_section_id", // Replace with actual section id
        type: 'grammar_vocab', // Combined type for grammar and vocabulary
        original_text: mistakes[i],
        corrected_text: corrections[i],
      });
    }

    // Send initial response back to the frontend
    return {
      mistakes: mistakes,
      corrections: corrections,
      explanations: explanations,
      correctedText: correctedText
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('further-correct')
  async handleFurtherCorrection(@Body() body: { text: string }, @Req() req: Request) {
    const furtherResult = await this.correctionService.callPythonService(body.text, 'further');

    const { organization, coherence, writingStyle } = furtherResult;

    const userId = req.user._id;

    // Combine all mistakes, corrections, and assign types
    const combinedMistakes = [
      ...organization.mistakes.map((mistake, i) => ({ mistake, correction: organization.corrections[i], type: 'organization' })),
      ...coherence.mistakes.map((mistake, i) => ({ mistake, correction: coherence.corrections[i], type: 'coherence' })),
      ...writingStyle.mistakes.map((mistake, i) => ({ mistake, correction: writingStyle.corrections[i], type: 'writingStyle' }))
    ];

    // Create and save issues in the database
    for (let i = 0; i < combinedMistakes.length; i++) {
      await this.issueService.addIssue(userId, {
        section: "some_section_id", // Replace with actual section id
        type: combinedMistakes[i].type,
        original_text: combinedMistakes[i].mistake,
        corrected_text: combinedMistakes[i].correction,
      });
    }

    console.log({
      organization: organization,
      coherence: coherence,
      writingStyle: writingStyle
    });

    // Return the organized feedback
    return {
      organization: organization,
      coherence: coherence,
      writingStyle: writingStyle
    };
  }
}
