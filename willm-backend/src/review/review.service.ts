import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { IssueService } from '../issue/issue.service';
import { SessionService } from '../session/session.service';
import { TextService } from '../text/text.service';
import { HttpService } from '@nestjs/axios';
import { Review } from './schema/review.schema';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class ReviewService {
  constructor(
    private readonly issueService: IssueService,
    private readonly sessionService: SessionService,
    private readonly textService: TextService,
    private readonly httpService: HttpService,
    @InjectModel(Review.name) private reviewModel: Model<Review>
  ) {}

  async generateReview(userId: Types.ObjectId, reviewModel: string): Promise<any> {
    // Retrieve the last 10 texts for the user
    const texts = await this.textService.findLastSubmissions(userId, 10);

    if (!texts || texts.length === 0) {
      return { reviewData: 'No text available.' };
    }

    const textIds: Types.ObjectId[] = texts.map(text => text._id).slice(-5) as Types.ObjectId[];

    const issues = await this.issueService.getIssuesByTextIds(textIds);

    if (!issues || issues.length === 0) {
      return { reviewData: 'Not enough sessions to generate review.' };
    }

    const grammarVocabIssues = issues.filter(issue => issue.type === 'grammar_vocab');
    const orgCohWritingIssues = issues.filter(issue => ['organization', 'coherence', 'writingStyle'].includes(issue.type));

    const getCategoryFrequency = (issues) => {
      return issues.reduce((acc, issue) => {
        acc[issue.category] = (acc[issue.category] || 0) + 1;
        return acc;
      }, {});
    };

    const grammarVocabFrequency = getCategoryFrequency(grammarVocabIssues);
    const orgCohWritingFrequency = getCategoryFrequency(orgCohWritingIssues);

    // Convert frequencies into arrays for each category
    const grammarVocabFrequencies = Object.values(grammarVocabFrequency);
    const orgFrequencies = Object.values(orgCohWritingFrequency).filter((_, idx) => issues[idx].type === 'organization');
    const cohFrequencies = Object.values(orgCohWritingFrequency).filter((_, idx) => issues[idx].type === 'coherence');
    const writingFrequencies = Object.values(orgCohWritingFrequency).filter((_, idx) => issues[idx].type === 'writingStyle');

    const getTopCategories = (frequency) => {
      return Object.keys(frequency).sort((a, b) => frequency[b] - frequency[a]).slice(0, 3);
    };

    const topGrammarVocabCategories = getTopCategories(grammarVocabFrequency);
    const topOrgCohWritingCategories = getTopCategories(orgCohWritingFrequency);

    const getCategoryTypeMap = (issues) => {
      return issues.reduce((acc, issue) => {
        if (!acc[issue.category]) {
          acc[issue.category] = issue.type;
        }
        return acc;
      }, {});
    };

    let reviewData = {
      grammar_vocab: { improvements: [], tips: [], frequencies: grammarVocabFrequencies },
      organization: { improvements: [], tips: [], frequencies: orgFrequencies },
      coherence: { improvements: [], tips: [], frequencies: cohFrequencies },
      writingStyle: { improvements: [], tips: [], frequencies: writingFrequencies },
    };

    const grammarVocabTypeMap = getCategoryTypeMap(grammarVocabIssues);
    const orgCohWritingTypeMap = getCategoryTypeMap(orgCohWritingIssues);

    const allReviews = await this.reviewModel.find({ user_id: userId }).sort({ date_created: -1 }).limit(25).exec();
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    const previousReview = allReviews.find(review => review.date_created < startOfToday);

    const coherenceSections = [];
    const organizationSections = [];

    if (texts.length >= 5) {
      const sectionTexts = texts.reduce((acc, text) => {
        if (!acc[text.section]) {
          acc[text.section] = [];
        }
        acc[text.section].push(text.content);
        return acc;
      }, {});

      const sections = Object.keys(sectionTexts);
      if (sections.length >= 2) {
        coherenceSections.push(...sections.slice(0, 2).map((section, i) => `Section ${i + 1}\n${sectionTexts[section].join(' ')}`));
      }
      if (sections.length >= 3) {
        organizationSections.push(...sections.slice(0, 3).map((section, i) => `Section ${i + 1}\n${sectionTexts[section].join(' ')}`));
      }
    }

    let coherence_tip = 'coherence_tip not generated';
    let organization_tip = 'organization_tip not generated';

    if (coherenceSections.length >= 2 || organizationSections.length >= 3) {
      const response = await lastValueFrom(this.httpService.post('http://flask-api:8000/review/generate', {
        model: reviewModel,
        coherence_text: coherenceSections.length >= 2 ? coherenceSections.join('\n\n') : 'coherence_tip not generated',
        organization_text: organizationSections.length >= 3 ? organizationSections.join('\n\n') : 'organization_tip not generated',
      }));
      coherence_tip = response.data.coherence_tip;
      organization_tip = response.data.organization_tip;
    }

    if (previousReview) {
      const previousFrequencies = {
        ...getCategoryFrequency((previousReview.review_data.grammar_vocab?.tips || []).map(tip => ({ category: tip }))),
        ...getCategoryFrequency((previousReview.review_data.organization?.tips || []).map(tip => ({ category: tip }))),
        ...getCategoryFrequency((previousReview.review_data.coherence?.tips || []).map(tip => ({ category: tip }))),
        ...getCategoryFrequency((previousReview.review_data.writingStyle?.tips || []).map(tip => ({ category: tip })))
      };

      const frequencyImprovements = Object.keys(previousFrequencies).filter(category => {
        const prevFreq = previousFrequencies[category];
        const currFreq = grammarVocabFrequency[category] || orgCohWritingFrequency[category] || 0;
        return currFreq < prevFreq;
      });

      frequencyImprovements.forEach(category => {
        const type = grammarVocabTypeMap[category] || orgCohWritingTypeMap[category];
        if (type && reviewData[type]) {
          reviewData[type].improvements.push(category);
        }
      });

      topGrammarVocabCategories.forEach(category => {
        reviewData.grammar_vocab.tips.push(category);
      });

      topOrgCohWritingCategories.forEach(category => {
        const type = orgCohWritingTypeMap[category];
        reviewData[type].tips.push(category);
      });

      reviewData.coherence.tips.push(coherence_tip);
      reviewData.organization.tips.push(organization_tip);

      const newReview = new this.reviewModel({
        user_id: userId,
        date_created: new Date(),
        review_data: reviewData,
        coherence_tip: coherence_tip,
        organization_tip: organization_tip,
        reviewModel: reviewModel,
      });
      await newReview.save();

      return { reviewData };
    }

    const sessions = await this.sessionService.getSessionsByUserId(userId.toHexString());
    const distinctDates = new Set(sessions.map(session => {
      const date = new Date(session.date_created);
      return date.toISOString();
    }));

    if (distinctDates.size < 2) {
      return { reviewData: '<2' };
    }

    topGrammarVocabCategories.forEach(category => {
      reviewData.grammar_vocab.tips.push(category);
    });

    topOrgCohWritingCategories.forEach(category => {
      const type = orgCohWritingTypeMap[category];
      reviewData[type].tips.push(category);
    });

    reviewData.coherence.tips.push(coherence_tip);
    reviewData.organization.tips.push(organization_tip);

    const newReview = new this.reviewModel({
      user_id: userId,
      date_created: new Date(),
      review_data: reviewData,
      reviewModel: reviewModel,
    });
    await newReview.save();

    return { reviewData: reviewData };
  }

  async getRecentReview(userId: Types.ObjectId): Promise<any> {
    const recentReview = await this.reviewModel.findOne({ user_id: userId }).sort({ date_created: -1 }).exec();
    if (!recentReview) {
      return { reviewData: 'No recent review available.' };
    }
    return { reviewData: recentReview.review_data };
  }
}
