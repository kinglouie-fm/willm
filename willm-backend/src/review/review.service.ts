import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { IssueService } from '../issue/issue.service';
import { SessionService } from '../session/session.service';
import { TextService } from '../text/text.service';
import { Review } from './schema/review.schema';

@Injectable()
export class ReviewService {
  constructor(
    private readonly issueService: IssueService,
    private readonly sessionService: SessionService,
    private readonly textService: TextService,
    @InjectModel(Review.name) private reviewModel: Model<Review>
  ) {}

  async generateReview(userId: Types.ObjectId): Promise<any> {
    // Retrieve the last 10 texts for the user
    const texts = await this.textService.findLastSubmissions(userId, 10);

    if (!texts || texts.length === 0) {
      return { reviewData: 'No text available.' };
    }

    // Get the text IDs and ensure they are of type Types.ObjectId[]
    const textIds: Types.ObjectId[] = texts.map(text => text._id) as Types.ObjectId[];

    // Retrieve issues related to the last 10 texts
    const issues = await this.issueService.getIssuesByTextIds(textIds);

    if (!issues || issues.length === 0) {
      return { reviewData: 'Not enough sessions to generate review.' };
    }

    // Separate issues into two groups
    const grammarVocabIssues = issues.filter(issue => issue.type === 'grammar_vocab');
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

    // Retrieve all reviews sorted by date in descending order
    const allReviews = await this.reviewModel.find({ user_id: userId }).sort({ date_created: -1 }).limit(25).exec();
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // Find the first review that is older than today
    const previousReview = allReviews.find(review => review.date_created < startOfToday);

    // Initialize reviewData manually
    let reviewData = {
      grammar_vocab: { improvements: [], tips: [] },
      organization: { improvements: [], tips: [] },
      coherence: { improvements: [], tips: [] },
      writingStyle: { improvements: [], tips: [] },
    };

    if (previousReview) {
      // Check for frequency improvements
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
    const distinctDates = new Set(sessions.map(session => {
      const date = new Date(session.date_created);
      return date.toISOString();
    }));

    if (distinctDates.size < 2) {
      return { reviewData: '<2' };
    }

    // Store the initial review
    topGrammarVocabCategories.forEach(category => {
      reviewData.grammar_vocab.tips.push(category);
    });

    topOrgCohWritingCategories.forEach(category => {
      const type = orgCohWritingTypeMap[category];
      reviewData[type].tips.push(category);
    });

    const newReview = new this.reviewModel({
      user_id: userId,
      date_created: new Date(),
      review_data: reviewData
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
