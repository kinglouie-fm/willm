import { Controller, Post, Body, UseGuards, Req, Res } from '@nestjs/common';
import { CorrectionService } from './correction.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IssueService } from '../issue/issue.service';
import { SessionService } from '../session/session.service';
import { SectionService } from '../section/section.service';
import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { TextService } from '../text/text.service';
import { ScoreService } from '../score/score.service';

@Controller('correct')
export class CorrectionController {
  private readonly maxLength = 1000;
  constructor(
    private readonly correctionService: CorrectionService,
    private readonly issueService: IssueService,
    private readonly sessionService: SessionService,
    // private readonly sectionService: SectionService,
    private readonly textService: TextService,
    private readonly scoreService: ScoreService
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async handleCorrection(@Body() body: { text: string, section: string, mode: string, language: string }, @Req() req: Request, @Res() res: Response) {
    if(body.text.length > this.maxLength) {
      return res.status(400).send("Text is too long");
    }
    console.log("Handling correction request");
    const initialResult = await this.correctionService.callPythonService(body.text, body.section, 'initial', body.language);
    const correctedText = initialResult.correctedText;
    console.log(initialResult);

    const mistakes = initialResult.mistakes || [];
    const corrections = initialResult.corrections || [];
    const explanations = initialResult.explanations || [];
    const categories = initialResult.categories || [];
    const contexts = initialResult.contexts || [];

    const userId = req.user._id;

    const session = await this.sessionService.getCurrentSession(userId);

    // Find or create the section
    // let section = await this.sectionService.findSectionByPayload(userId, body.section);
    // if (!section) {
    //   section = await this.sectionService.addSection(userId, {
    //     payload: body.section,
    //     date_created: new Date(),
    //   });
    // }

    // Create a new Text document
    const text = await this.textService.addText(userId, {
      session_id: session._id,
      section: body.section,
      content: body.text,
      mode: body.mode,
      language: body.language,
      createdAt: new Date()
    });

    // Generate scores for the text and save them with the text_id
    const textId = text._id as Types.ObjectId;
    const scoreData = await this.scoreService.generateScore(body.text, userId, body.section, textId);

    // Add issues for initial corrections
    for (let i = 0; i < mistakes.length; i++) {
      if (mistakes[i] === "The submitted writing is fine.") {
        continue;
      }

      const issue = await this.issueService.addIssue(userId, {
        section: body.section,
        session: session._id,
        text: text._id,
        type: 'grammar_vocab',
        original_text: mistakes[i],
        corrected_text: corrections[i],
        category: categories[i] || 'Uncategorized'
      });
      session.issues.push(issue._id as Types.ObjectId);
    }

    await session.save();

    // Perform further correction if correctedText is available
    let furtherCorrectionResult = null;
    if (correctedText) {
      try {
        console.log("Performing further correction");
        furtherCorrectionResult = await this.correctionService.callPythonService(correctedText, body.section, 'further', body.language);

        const { organization, coherence, writingStyle } = furtherCorrectionResult;

        const combinedMistakes = [
          ...(organization?.mistakes ?? []).map((mistake, i) => organization.corrections && organization.corrections[i] ? ({ mistake, correction: organization.corrections[i], type: 'organization', category: organization.categories[i] }) : null),
          ...(coherence?.mistakes ?? []).map((mistake, i) => coherence.corrections && coherence.corrections[i] ? ({ mistake, correction: coherence.corrections[i], type: 'coherence', category: coherence.categories[i] }) : null),
          ...(writingStyle?.mistakes ?? []).map((mistake, i) => writingStyle.corrections && writingStyle.corrections[i] ? ({ mistake, correction: writingStyle.corrections[i], type: 'writingStyle', category: writingStyle.categories[i] }) : null)
        ].filter(issue => issue !== null); // Filter out any null values

        // Add issues for further corrections
        for (let i = 0; i < combinedMistakes.length; i++) {
          if (combinedMistakes[i].mistake === "The submitted writing is fine.") {
            continue;
          }

          const issue = await this.issueService.addIssue(userId, {
            section: body.section,
            session: session._id,
            text: text._id,
            type: combinedMistakes[i].type,
            original_text: combinedMistakes[i].mistake,
            corrected_text: combinedMistakes[i].correction,
            category: combinedMistakes[i].category || 'Uncategorized'
          });
          session.issues.push(issue._id as Types.ObjectId);
        }

        await session.save();

      } catch (error) {
        console.error('Error in further correction:', error);
      }
    }

    // Send combined response to frontend
    return res.json({
      mistakes: mistakes,
      corrections: corrections,
      explanations: explanations,
      categories: categories,
      contexts: contexts,
      correctedText: correctedText,
      furtherCorrection: furtherCorrectionResult,
      scores: scoreData
    });
  }
}
