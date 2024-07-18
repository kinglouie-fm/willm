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

    console.log('Retrieved issues:', issues);

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
    console.log('Grammar/Vocab Frequency:', grammarVocabFrequency);
    const orgCohWritingFrequency = getCategoryFrequency(orgCohWritingIssues);
    console.log('Org/Coh/Writing Frequency:', orgCohWritingFrequency);

    // Sort categories by frequency and get the top 3 for each group
    const getTopCategories = (frequency) => {
      return Object.keys(frequency).sort((a, b) => frequency[b] - frequency[a]).slice(0, 3);
    };

    const topGrammarVocabCategories = getTopCategories(grammarVocabFrequency);
    console.log('Top Grammar/Vocab Categories:', topGrammarVocabCategories);
    const topOrgCohWritingCategories = getTopCategories(orgCohWritingFrequency);
    console.log('Top Org/Coh/Writing Categories:', topOrgCohWritingCategories);

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
    console.log('Grammar/Vocab Type Map:', grammarVocabTypeMap);
    const orgCohWritingTypeMap = getCategoryTypeMap(orgCohWritingIssues);
    console.log('Org/Coh/Writing Type Map:', orgCohWritingTypeMap);

    // Retrieve all reviews sorted by date in descending order
    const allReviews = await this.reviewModel.find({ user_id: userId }).sort({ date_created: -1 }).limit(25).exec();
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // Find the first review that is older than today
    const previousReview = allReviews.find(review => review.date_created < startOfToday);

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

      console.log('Frequency Improvements:', frequencyImprovements);

      const reviewData = {
        grammar_vocab: { improvements: [], tips: [] },
        organization: { improvements: [], tips: [] },
        coherence: { improvements: [], tips: [] },
        writingStyle: { improvements: [], tips: [] },
      };

      frequencyImprovements.forEach(category => {
        const type = grammarVocabTypeMap[category] || orgCohWritingTypeMap[category];
        if (type in reviewData) {
          reviewData[type].improvements.push(category);
        }
      });

      topGrammarVocabCategories.forEach(category => {
        const type = grammarVocabTypeMap[category];
        if (type in reviewData) {
          reviewData.grammar_vocab.tips.push(category);
        }
      });

      topOrgCohWritingCategories.forEach(category => {
        const type = orgCohWritingTypeMap[category];
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
    const distinctDates = new Set(sessions.map(session => {
      const date = new Date(session.date_created);
      return date.toISOString();
    }));

    if (distinctDates.size < 2) {
      return { reviewData: '<2' };
    }

    // Store the initial review
    const initialReviewData = {
      grammar_vocab: { improvements: [], tips: [] },
      organization: { improvements: [], tips: [] },
      coherence: { improvements: [], tips: [] },
      writingStyle: { improvements: [], tips: [] },
    };

    topGrammarVocabCategories.forEach(category => {
      const type = grammarVocabTypeMap[category];
      if (type in initialReviewData) {
        initialReviewData.grammar_vocab.tips.push(category);
      }
    });

    topOrgCohWritingCategories.forEach(category => {
      const type = orgCohWritingTypeMap[category];
      if (type in initialReviewData) {
        initialReviewData[type].tips.push(category);
      }
    });

    console.log('Initial Review Data:', initialReviewData);

    const newReview = new this.reviewModel({
      user_id: userId,
      date_created: new Date(),
      review_data: initialReviewData
    });
    await newReview.save();

    return { reviewData: initialReviewData };
  }
}
