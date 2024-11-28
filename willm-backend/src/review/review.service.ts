import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { IssueService } from '../issue/issue.service';
import { UserService } from '../user/user.service';
import { TextService } from '../text/text.service';
import { HttpService } from '@nestjs/axios';
import { Review } from './schema/review.schema';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class ReviewService {
  constructor(
    private readonly issueService: IssueService,
    private readonly userService: UserService,
    private readonly textService: TextService,
    private readonly httpService: HttpService,
    @InjectModel(Review.name) private reviewModel: Model<Review>
  ) {}

  // Generate a review for a user
  async generateReview(userId: Types.ObjectId, review_model: string): Promise<any> {
    // Retrieve the last 10 texts for the user
    const texts = await this.textService.findLastSubmissions(userId, 10);

    // If there are not enough texts, return an error message
    if (!texts || texts.length < 5) {
      return { reviewData: 'Not enough texts available to generate a review.' };
    }

    // Split texts into two groups: recent 5 and previous 6-10
    const recentTextIds: Types.ObjectId[] = texts.slice(0, 5).map(text => text._id) as Types.ObjectId[];
    let previousTextIds: Types.ObjectId[] = [];

    // If there are at least 10 texts, save the ids of text 6-10 
    if (texts.length >= 10) {
      previousTextIds = texts.slice(5, 10).map(text => text._id) as Types.ObjectId[];
    }

    // Fetch issues for recent group
    const recentIssues = await this.issueService.getIssuesByTextIds(recentTextIds);

    // If there are no issues, return an error message
    if (!recentIssues || recentIssues.length === 0) {
      return { reviewData: 'Not enough recent issues to generate a review.' };
    }

    // Calculate frequencies for recent issues
    const recentGrammarVocabIssues = recentIssues.filter(issue => issue.type === 'grammar_vocab');
    const recentOrgCohWritingIssues = recentIssues.filter(issue => ['organization', 'coherence', 'writingStyle'].includes(issue.type));

    const recentGrammarVocabFrequency = this.getCategoryFrequency(recentGrammarVocabIssues);
    const recentOrgCohWritingFrequency = this.getCategoryFrequency(recentOrgCohWritingIssues);

    let reviewData = {
      grammar_vocab: { improvements: [], tips: [], frequencies: [] },
      organization: { improvements: [], tips: [], frequencies: [] },
      coherence: { improvements: [], tips: [], frequencies: [] },
      writingStyle: { improvements: [], tips: [], frequencies: [] },
    };

    // Assign the highest frequency tip to grammar_vocab
    const topGrammarVocabCategory = this.getTopCategories(recentGrammarVocabFrequency);
    if (topGrammarVocabCategory) {
      reviewData.grammar_vocab.frequencies.push(recentGrammarVocabFrequency[topGrammarVocabCategory]);
      reviewData.grammar_vocab.tips.push(topGrammarVocabCategory);
    }

    // Assign the highest frequency tip to each type in orgCohWritingCategories
    ['organization', 'coherence', 'writingStyle'].forEach(type => {
      const relevantIssues = recentOrgCohWritingIssues.filter(issue => issue.type === type);
      if (relevantIssues.length > 0) {
        const categoryFrequency = this.getCategoryFrequency(relevantIssues);
        const topCategory = this.getTopCategories(categoryFrequency);
        if (topCategory) {
          reviewData[type].frequencies.push(categoryFrequency[topCategory]);
          reviewData[type].tips.push(topCategory);
        }
      }
    });

    // Only calculate improvements if there are at least 10 texts
    if (texts.length >= 10) {
      // Fetch issues for previous group
      const previousIssues = await this.issueService.getIssuesByTextIds(previousTextIds);

      if (previousIssues && previousIssues.length > 0) {
        // Calculate frequencies for previous issues (6-10 texts)
        const previousGrammarVocabIssues = previousIssues.filter(issue => issue.type === 'grammar_vocab');
        const previousOrgCohWritingIssues = previousIssues.filter(issue => ['organization', 'coherence', 'writingStyle'].includes(issue.type));

        const previousGrammarVocabFrequency = this.getCategoryFrequency(previousGrammarVocabIssues);
        const previousOrgCohWritingFrequency = this.getCategoryFrequency(previousOrgCohWritingIssues);

        // Calculate improvements by comparing recent with previous frequencies
        this.calculateImprovements(reviewData, recentGrammarVocabFrequency, previousGrammarVocabFrequency, recentOrgCohWritingFrequency, previousOrgCohWritingFrequency, recentGrammarVocabIssues, recentOrgCohWritingIssues);
      }
    }

    // Generate coherence/organization tips if applicable
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

      // For generating coherence/organization tips, use the first 2 sections for coherence and the first 3 sections for organization
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

    // If there are enough sections, generate coherence/organization tips
    if (coherenceSections.length >= 2 || organizationSections.length >= 3) {
      let dailyRequestsLeft = await this.userService.getDailyRequestsLeft(userId);

      // If the user has no daily requests left for 4o, return an error message
      if (dailyRequestsLeft <= 0 && review_model === '4o') {
        return { reviewData: 'No recent review available.' };
      }

      // Generate coherence/organization tips using the Flask API
      const response = await lastValueFrom(this.httpService.post('http://flask-api:8031/review/generate', {
        model: review_model,
        coherence_text: coherenceSections.length >= 2 ? coherenceSections.join('\n\n') : 'coherence_tip not generated',
        organization_text: organizationSections.length >= 3 ? organizationSections.join('\n\n') : 'organization_tip not generated',
      }));

      // Decrement the user's daily requests left
      if(review_model === '4o') {
        await this.userService.setDailyRequestsLeft(userId, dailyRequestsLeft - 1);
        dailyRequestsLeft -= 1;
      }

      coherence_tip = response.data.coherence_tip;
      organization_tip = response.data.organization_tip;
    }

    reviewData.coherence.tips.push(coherence_tip);
    reviewData.organization.tips.push(organization_tip);

    // Save the review to the database
    const newReview = new this.reviewModel({
      user_id: userId,
      date_created: new Date(),
      review_data: reviewData,
      reviewModel: review_model,
    });

    await newReview.save();

    return { reviewData };
  }

  // Calculate the frequency of each category in a list of issues
  getCategoryFrequency(issues) {
    return issues.reduce((acc, issue) => {
      acc[issue.category] = (acc[issue.category] || 0) + 1;
      return acc;
    }, {});
  }

  // Get the top categories by frequency
  getTopCategories(frequency) {
    return Object.keys(frequency).sort((a, b) => frequency[b] - frequency[a])[0];
  }

  // Map categories to their respective types
  getCategoryTypeMap(issues) {
    return issues.reduce((acc, issue) => {
      if (!acc[issue.category]) {
        acc[issue.category] = issue.type;
      }
      return acc;
    }, {});
  }

  // Calculate improvements by comparing recent with previous frequencies
  calculateImprovements(reviewData, recentGrammarVocabFrequency, previousGrammarVocabFrequency, recentOrgCohWritingFrequency, previousOrgCohWritingFrequency, recentGrammarVocabIssues, recentOrgCohWritingIssues) {
    const grammarVocabTypeMap = this.getCategoryTypeMap(recentGrammarVocabIssues);
    const orgCohWritingTypeMap = this.getCategoryTypeMap(recentOrgCohWritingIssues);

    // Compare frequencies and find the top improvement (highest frequency difference)
    const getTopImprovement = (recentFreq, previousFreq, typeMap) => {
      let topImprovement = null;
      let maxDifference = 0;

      Object.keys(previousFreq).forEach(category => {
        const prevFreq = previousFreq[category];
        const currFreq = recentFreq[category] || 0;
        const difference = prevFreq - currFreq;

        if (difference > maxDifference) {
          maxDifference = difference;
          topImprovement = { category, type: typeMap[category] };
        }
      });

      return topImprovement;
    };

    // Find the top improvement for grammar_vocab
    const topGrammarVocabImprovement = getTopImprovement(recentGrammarVocabFrequency, previousGrammarVocabFrequency, grammarVocabTypeMap);
    if (topGrammarVocabImprovement && reviewData[topGrammarVocabImprovement.type]) {
      reviewData[topGrammarVocabImprovement.type].improvements.push(topGrammarVocabImprovement.category);
    }

    // Find the top improvement for orgCohWriting categories
    const topOrgCohWritingImprovement = getTopImprovement(recentOrgCohWritingFrequency, previousOrgCohWritingFrequency, orgCohWritingTypeMap);
    if (topOrgCohWritingImprovement && reviewData[topOrgCohWritingImprovement.type]) {
      reviewData[topOrgCohWritingImprovement.type].improvements.push(topOrgCohWritingImprovement.category);
    }
  }


  // Get the most recent review for a user
  async getRecentReview(userId: Types.ObjectId): Promise<any> {
    const recentReview = await this.reviewModel.findOne({ user_id: userId }).sort({ date_created: -1 }).exec();
    if (!recentReview) {
      return { reviewData: 'No recent review available.' };
    }
    return { reviewData: recentReview.review_data };
  }
}
