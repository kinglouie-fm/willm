import { Controller, Post, Body, UseGuards, Req, Res } from '@nestjs/common';
import { CorrectionService } from './correction.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IssueService } from '../issue/issue.service';
import { SessionService } from '../session/session.service';
import { SectionService } from '../section/section.service';
import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { TextService } from '../text/text.service';

@Controller('correct')
export class CorrectionController {
  constructor(
    private readonly correctionService: CorrectionService,
    private readonly issueService: IssueService,
    private readonly sessionService: SessionService,
    private readonly sectionService: SectionService,
    private readonly textService: TextService
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async handleCorrection(@Body() body: { text: string, section: string }, @Req() req: Request) {
    const initialResult = await this.correctionService.callPythonService(body.text, body.section, 'initial');
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
        date_created: new Date(),
      });
    }

    // Create a new Text document
    const text = await this.textService.addText(userId, {
      session_id: session._id,
      section_id: section._id,
      content: body.text,
      issues: []
    });

    // Add issues
    for (let i = 0; i < mistakes.length; i++) {
      if (mistakes[i] === "The submitted writing is fine.") {
        continue;
      }

      const issue = await this.issueService.addIssue(userId, {
        section: section._id,
        session: session._id,
        text: text._id,
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
    const furtherResult = await this.correctionService.callPythonService(body.text, body.section, 'further');

    const { organization, coherence, writingStyle } = furtherResult;

    const userId = req.user._id;

    const session = await this.sessionService.getCurrentSession(userId);

    // Find or create the section
    let section = await this.sectionService.findSectionByPayload(userId, body.section);
    if (!section) {
      section = await this.sectionService.addSection(userId, {
        payload: body.section,
        date_created: new Date(),
      });
    }

    // Create a new Text document
    const text = await this.textService.addText(userId, {
      session_id: session._id,
      section_id: section._id,
      content: body.text,
      issues: []
    });

    const combinedMistakes = [
      ...organization.mistakes.map((mistake, i) => ({ mistake, correction: organization.corrections[i], type: 'organization' })),
      ...coherence.mistakes.map((mistake, i) => ({ mistake, correction: coherence.corrections[i], type: 'coherence' })),
      ...writingStyle.mistakes.map((mistake, i) => ({ mistake, correction: writingStyle.corrections[i], type: 'writingStyle' }))
    ];

    // Add issues
    for (let i = 0; i < combinedMistakes.length; i++) {
      if (combinedMistakes[i].mistake === "The submitted writing is fine.") {
        continue;
      }

      const issue = await this.issueService.addIssue(userId, {
        section: section._id,
        session: session._id,
        text: text._id,
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

  @UseGuards(JwtAuthGuard)
  @Post('improve')
  async handleImprovementRequest(@Req() req: Request, @Res() res: Response) {
    const userId = req.user._id;

    // Check if the user has more than 2 sessions
    const sessions = await this.sessionService.getSessionsByUserId(userId);
    if (sessions.length < 3) {
      return res.status(200).send('<2');
    }

    // Retrieve the last 5 sessions and their associated issues
    const lastFiveSessions = sessions.slice(-5);
    const sessionIds = lastFiveSessions.map(s => s._id) as Types.ObjectId[];
    const issues = await this.issueService.getIssuesBySessions(sessionIds);

    // Categorize issues
    const sameSectionIssues: { [key: string]: any[] } = {};
    const differentSectionIssues: any[] = [];

    issues.forEach(issue => {
      const sectionId = issue.section.toHexString();
      if (!sameSectionIssues[sectionId]) {
        sameSectionIssues[sectionId] = [];
      }
      sameSectionIssues[sectionId].push(issue);
    });

    Object.keys(sameSectionIssues).forEach(sectionId => {
      if (sameSectionIssues[sectionId].length === 1) {
        differentSectionIssues.push(...sameSectionIssues[sectionId]);
        delete sameSectionIssues[sectionId];
      }
    });

    const prompts = [];

    Object.keys(sameSectionIssues).forEach(sectionId => {
      const sectionIssues = sameSectionIssues[sectionId].map(issue => issue.original_text).join('\n- ');
      prompts.push({
        prompt: 'DETAILED_IMPROVEMENTS',
        data: {
          section_name: sectionId,
          issues: sectionIssues
        }
      });
    });

    if (differentSectionIssues.length > 0) {
      const issuesText = differentSectionIssues.map(issue => issue.original_text).join('\n- ');
      prompts.push({
        prompt: 'GENERAL_IMPROVEMENT',
        data: { issues: issuesText }
      });
    }

    console.log(prompts);

    const improvements = await this.correctionService.getImprovementsFromFlaskAPI(prompts);

    return res.status(200).json(improvements);
  }
}
