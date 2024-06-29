import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { CorrectionService } from './correction.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IssueService } from '../issue/issue.service';
import { SessionService } from '../session/session.service';
import { SectionService } from '../section/section.service';
import { Request } from 'express';
import { Types } from 'mongoose';

@Controller('correct')
export class CorrectionController {
  constructor(
    private readonly correctionService: CorrectionService,
    private readonly issueService: IssueService,
    private readonly sessionService: SessionService,
    private readonly sectionService: SectionService
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async handleCorrection(@Body() body: { text: string, section: string }, @Req() req: Request) {
    const initialResult = await this.correctionService.callPythonService(body.text, 'initial');
    const correctedText = initialResult.correctedText;

    const mistakes = initialResult.mistakes || [];
    const corrections = initialResult.corrections || [];
    const explanations = initialResult.explanations || [];

    const userId = req.user._id;

    const session = await this.sessionService.getCurrentSession(userId);

    // Find or create the section
    let section = await this.sectionService.findSectionByPayload(userId, body.section);
    if (!section) {
      section = await this.sectionService.addSection(userId, {
        payload: body.section,
      });
    }

    for (let i = 0; i < mistakes.length; i++) {
      if (mistakes[i] === "The submitted writing is fine.") {
        continue;
      }

      const issue = await this.issueService.addIssue(userId, {
        section: section._id,
        type: 'grammar_vocab',
        original_text: mistakes[i],
        corrected_text: corrections[i],
      });
      session.issues.push(issue._id as Types.ObjectId);
    }

    await session.save();

    return {
      mistakes: mistakes,
      corrections: corrections,
      explanations: explanations,
      correctedText: correctedText
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('further-correct')
  async handleFurtherCorrection(@Body() body: { text: string, section: string }, @Req() req: Request) {
    const furtherResult = await this.correctionService.callPythonService(body.text, 'further');

    const { organization, coherence, writingStyle } = furtherResult;

    const userId = req.user._id;

    const session = await this.sessionService.getCurrentSession(userId);

    // Find or create the section
    let section = await this.sectionService.findSectionByPayload(userId, body.section);
    if (!section) {
      section = await this.sectionService.addSection(userId, {
        payload: body.section,
      });
    }

    const combinedMistakes = [
      ...organization.mistakes.map((mistake, i) => ({ mistake, correction: organization.corrections[i], type: 'organization' })),
      ...coherence.mistakes.map((mistake, i) => ({ mistake, correction: coherence.corrections[i], type: 'coherence' })),
      ...writingStyle.mistakes.map((mistake, i) => ({ mistake, correction: writingStyle.corrections[i], type: 'writingStyle' }))
    ];

    for (let i = 0; i < combinedMistakes.length; i++) {
      if (combinedMistakes[i].mistake === "The submitted writing is fine.") {
        continue;
      }

      const issue = await this.issueService.addIssue(userId, {
        section: section._id,
        type: combinedMistakes[i].type,
        original_text: combinedMistakes[i].mistake,
        corrected_text: combinedMistakes[i].correction,
      });
      session.issues.push(issue._id as Types.ObjectId);
    }

    await session.save();

    return {
      organization: organization,
      coherence: coherence,
      writingStyle: writingStyle
    };
  }
}
