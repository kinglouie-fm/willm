import { Controller, Post, Body, UseGuards, Req, Res } from '@nestjs/common';
import { CorrectionService } from './correction.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IssueService } from '../issue/issue.service';
import { SessionService } from '../session/session.service';
import { UserService } from '../user/user.service';
import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { TextService } from '../text/text.service';
import { ScoreService } from '../score/score.service';

// This controller is responsible for handling correction requests
@Controller('correct')
export class CorrectionController {
  private readonly maxLength = 500;
  constructor(
    private readonly correctionService: CorrectionService,
    private readonly issueService: IssueService,
    private readonly sessionService: SessionService,
    private readonly textService: TextService,
    private readonly scoreService: ScoreService,
    private readonly userService: UserService
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async handleCorrection(@Body() body: { text: string, section: string, mode: string, 
    language: string, correctionModel: string, furtherCorrectionModel: string, 
    scoreModel: string }, @Req() req: Request, @Res() res: Response) {
    const userId = req.user._id;
    let dailyRequestsLeft = await this.userService.getDailyRequestsLeft(userId);

    const wordCount = body.text.trim().split(/\s+/).filter(word => word.length > 0).length;

    if (wordCount > this.maxLength) {
      return res.status(400).send("Text is too long");
    }

    // Check if the user has any daily requests left for gpt-4o
    if (dailyRequestsLeft <= 0 && body.correctionModel === '4o') {
      return res.status(403).send({ message: "No more gpt-4o requests left for today" });
    }
    
    console.log("Handling correction request");

    // Perform initial correction (grammar, vocabulary)
    const initialResult = await this.correctionService.callPythonService(body.text, body.section, 'initial', body.language, body.correctionModel);
    const correctedText = initialResult.correctedText;

    const mistakes = initialResult.mistakes || [];
    const corrections = initialResult.corrections || [];
    const explanations = initialResult.explanations || [];
    const categories = initialResult.categories || [];
    const contexts = initialResult.contexts || [];

    // Decrement dailyRequestsLeft if 4o model is used
    if(body.correctionModel === '4o') {
      await this.userService.setDailyRequestsLeft(userId, dailyRequestsLeft - 1);
      dailyRequestsLeft -= 1;
    }

    const session = await this.sessionService.getCurrentSession(userId);

    // Create a new Text document
    const text = await this.textService.addText(userId, {
      session_id: session._id,
      section: body.section,
      content: body.text,
      mode: body.mode,
      language: body.language,
      correctionModel: body.correctionModel,
      furtherCorrectionModel: body.furtherCorrectionModel,
      scoreModel: body.scoreModel,
      createdAt: new Date()
    });

    // Generate scores for the text and save them with the text_id
    const textId = text._id as Types.ObjectId;

    // Check if the user has any daily requests left for gpt-4o
    if (dailyRequestsLeft <= 0 && body.scoreModel === '4o') {
      return res.status(403).send({ message: "No more gpt-4o requests left for today" });
    }

    // Generate scores for the text
    const scoreData = await this.scoreService.generateScore(body.text, userId, body.section, textId, body.scoreModel);

    // Decrement dailyRequestsLeft if 4o model is used
    if(body.scoreModel === '4o') {
      await this.userService.setDailyRequestsLeft(userId, dailyRequestsLeft - 1);
      dailyRequestsLeft -= 1;
    }

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

        // Check if the user has any daily requests left for gpt-4o
        if (dailyRequestsLeft <= 0 && body.furtherCorrectionModel === '4o') {
          return res.status(403).send({ message: "No more gpt-4o requests left for today" });
        }

        // Perform further correction (organization, coherence, writing style)
        furtherCorrectionResult = await this.correctionService.callPythonService(correctedText, body.section, 'further', body.language, body.furtherCorrectionModel);

        // Decrement dailyRequestsLeft if 4o model is used
        if(body.furtherCorrectionModel === '4o') {
          await this.userService.setDailyRequestsLeft(userId, dailyRequestsLeft - 1);
          dailyRequestsLeft -= 1;
        }

        const { organization, coherence, writingStyle } = furtherCorrectionResult;

        // Combine mistakes and corrections from all three categories
        const combinedMistakes = [
          ...(organization?.mistakes ?? []).map((mistake, i) => organization.corrections && organization.corrections[i] ? ({ mistake, correction: organization.corrections[i], type: 'organization', category: organization.categories[i] }) : null),
          ...(coherence?.mistakes ?? []).map((mistake, i) => coherence.corrections && coherence.corrections[i] ? ({ mistake, correction: coherence.corrections[i], type: 'coherence', category: coherence.categories[i] }) : null),
          ...(writingStyle?.mistakes ?? []).map((mistake, i) => writingStyle.corrections && writingStyle.corrections[i] ? ({ mistake, correction: writingStyle.corrections[i], type: 'writingStyle', category: writingStyle.categories[i] }) : null)
        ].filter(issue => issue !== null);

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
