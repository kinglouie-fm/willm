import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { IssueService } from '../issue/issue.service';
import { SessionService } from '../session/session.service';
import { Review } from './schema/review.schema';

@Injectable()
export class ReviewService {
  constructor(
    private readonly issueService: IssueService,
    private readonly sessionService: SessionService,
    @InjectModel(Review.name) private reviewModel: Model<Review>
  ) {}

  async generateReview(userId: Types.ObjectId): Promise<any> {
    // Retrieve the last 25 issues per type for the user
    const issues = await this.issueService.getLastIssuesByType(userId, 25);

    if (!issues || issues.length === 0) {
      return { reviewData: 'Not enough sessions to generate review.' };
    }

    // Separate issues into two groups
    const grammarVocabIssues = issues.filter(issue => issue.type === 'grammar' || issue.type === 'vocabulary');
    const orgCohWritingIssues = issues.filter(issue => ['organization', 'coherence', 'writingStyle'].includes(issue.type));

    // Calculate the frequency of each category in both groups
    const getCategoryFrequency = (issues) => {
      return issues.reduce((acc, issue) => {
        acc[issue.category] = (acc[issue.category] || 0) + 1;
        return acc;
      }, {});
    };

    const grammarVocabFrequency = getCategoryFrequency(grammarVocabIssues);
    const orgCohWritingFrequency = getCategoryFrequency(orgCohWritingIssues);

    // Sort categories by frequency and get the top 3 for each group
    const getTopCategories = (frequency) => {
      return Object.keys(frequency).sort((a, b) => frequency[b] - frequency[a]).slice(0, 3);
    };

    const topGrammarVocabCategories = getTopCategories(grammarVocabFrequency);
    const topOrgCohWritingCategories = getTopCategories(orgCohWritingFrequency);

    // Create a mapping of categories to their types
    const getCategoryTypeMap = (issues) => {
      return issues.reduce((acc, issue) => {
        if (!acc[issue.category]) {
          acc[issue.category] = issue.type;
        }
        return acc;
      }, {});
    };

    const grammarVocabTypeMap = getCategoryTypeMap(grammarVocabIssues);
    const orgCohWritingTypeMap = getCategoryTypeMap(orgCohWritingIssues);

    // Distribute top categories into their respective types
    const reviewData = {
      grammar: { improvements: [], tips: [] },
      vocabulary: { improvements: [], tips: [] },
      organization: { improvements: [], tips: [] },
      coherence: { improvements: [], tips: [] },
      writingStyle: { improvements: [], tips: [] },
    };

    topGrammarVocabCategories.forEach(category => {
      const type = grammarVocabTypeMap[category];
      if (type in reviewData) {
        reviewData[type].tips.push(category);
      }
    });

    topOrgCohWritingCategories.forEach(category => {
      const type = orgCohWritingTypeMap[category];
      if (type in reviewData) {
        reviewData[type].tips.push(category);
      }
    });

    // Check for a previous review
    const previousReview = await this.reviewModel.findOne({ user_id: userId }).sort({ date_created: -1 }).exec();
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    if (previousReview && previousReview.date_created < startOfToday) {
      const previousTopCategories = Object.values(previousReview.review_data).flatMap(section => section.tips);

      // Determine if there are improvements
      const improvements = [...topGrammarVocabCategories, ...topOrgCohWritingCategories].filter(category => !previousTopCategories.includes(category));
      const tips = [...topGrammarVocabCategories, ...topOrgCohWritingCategories].filter(category => previousTopCategories.includes(category));

      const reviewData = {
        grammar: { improvements: [], tips: [] },
        vocabulary: { improvements: [], tips: [] },
        organization: { improvements: [], tips: [] },
        coherence: { improvements: [], tips: [] },
        writingStyle: { improvements: [], tips: [] },
      };

      improvements.forEach(category => {
        const type = grammarVocabTypeMap[category] || orgCohWritingTypeMap[category];
        if (type in reviewData) {
          reviewData[type].improvements.push(category);
        }
      });

      tips.forEach(category => {
        const type = grammarVocabTypeMap[category] || orgCohWritingTypeMap[category];
        if (type in reviewData) {
          reviewData[type].tips.push(category);
        }
      });

      // Store the review
      const newReview = new this.reviewModel({
        user_id: userId,
        date_created: new Date(),
        review_data: reviewData
      });
      await newReview.save();

      return { reviewData };
    }

    // Check if there are at least two different sessions with different dates
    const sessions = await this.sessionService.getSessionsByUserId(userId.toHexString());
    const distinctDates = new Set(sessions.map(session => session.date_created.toDateString()));

    if (distinctDates.size < 2) {
      return { reviewData: '<2' };
    }

    // Store the initial review
    const initialReviewData = {
      grammar: { improvements: [], tips: [] },
      vocabulary: { improvements: [], tips: [] },
      organization: { improvements: [], tips: [] },
      coherence: { improvements: [], tips: [] },
      writingStyle: { improvements: [], tips: [] },
    };

    topGrammarVocabCategories.forEach(category => {
      const type = grammarVocabTypeMap[category];
      if (type in initialReviewData) {
        initialReviewData[type].tips.push(category);
      }
    });

    topOrgCohWritingCategories.forEach(category => {
      const type = orgCohWritingTypeMap[category];
      if (type in initialReviewData) {
        initialReviewData[type].tips.push(category);
      }
    });

    const newReview = new this.reviewModel({
      user_id: userId,
      date_created: new Date(),
      review_data: initialReviewData
    });
    await newReview.save();

    return { reviewData: initialReviewData };
  }
}
