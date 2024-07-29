import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { User } from '../user/schema/user.schema';

@Injectable()
export class GamificationService {
  private readonly config = {
    xp_allocation: {
      daily_login: 50,
      correct_answer: 10,
      max_score_bonus: 30,
      achievements: {
        quizzes_completed: {
          "5": 100,
          "10": 200,
          "15": 300,
        },
        correct_answers: {
          "25": 100,
          "50": 200,
          "75": 300,
        },
        weekly_streaks: {
          "1": 100,
          "2": 200,
          "3": 300,
          "4": 400,
        },
        consecutive_days: {
          "3": 50,
          "7": 150,
          "14": 300,
          "21": 500,
        },
      },
    },
    badges: {
      rookie: {
        criteria: {
          quizzes_completed: 2,
        },
      },
      pro: {
        criteria: {
          quizzes_completed: 3,
          consecutive_days: 5,
          correct_answers: 20,
        },
      },
      leader: {
        criteria: {
          quizzes_completed: 4,
          correct_answers: 25,
          weekly_streaks: 1,
        },
      },
      guru: {
        criteria: {
          quizzes_completed: 5,
          correct_answers: 30,
        },
      },
    },
    levels: {
      "1": 0,
      "2": 100,
      "3": 300,
      "4": 600,
      "5": 1000,
    },
  };

  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async handleLogin(userId: Types.ObjectId): Promise<void> {
    const user = await this.userModel.findById(userId);
    const now = new Date();

    // Check for daily streak
    const lastLoginDate = new Date(user.last_login);
    const isConsecutiveDay = (now.getTime() - lastLoginDate.getTime()) < 24 * 60 * 60 * 1000;

    if (isConsecutiveDay) {
      user.daily_streak += 1;
    } else {
      user.daily_streak = 1;
    }

    // Check for weekly streak
    const lastWeekStart = new Date(now);
    lastWeekStart.setDate(now.getDate() - now.getDay());

    const lastLoginWeekStart = new Date(lastLoginDate);
    lastLoginWeekStart.setDate(lastLoginDate.getDate() - lastLoginDate.getDay());

    if (lastWeekStart.getTime() !== lastLoginWeekStart.getTime()) {
      user.weekly_streak = 1;
    } else {
      user.weekly_streak += 1;
    }

    user.last_login = now;
    user.xp += this.getXPForAction('daily_login');

    await this.checkAchievementsAndBadges(user);
    await user.save();
  }

  async handleQuizCompletion(userId: Types.ObjectId): Promise<void> {
    const user = await this.userModel.findById(userId);

    // Update achievements
    user.achievements.quizzes_completed = (user.achievements.quizzes_completed || 0) + 1;

    await this.checkAchievementsAndBadges(user);
    await user.save();
  }

  async handleCorrectAnswer(userId: Types.ObjectId): Promise<void> {
    const user = await this.userModel.findById(userId);

    // Update correct answers count
    user.achievements.correct_answers = (user.achievements.correct_answers || 0) + 1;

    // Grant XP for a correct answer
    user.xp += this.getXPForAction('correct_answer');

    await this.checkAchievementsAndBadges(user);
    await user.save();
  }

  getXPForAction(action: string): number {
    return this.config.xp_allocation[action] || 0;
  }

  async checkAchievementsAndBadges(user: User): Promise<void> {
    // Check achievements
    for (const [key, stages] of Object.entries(this.config.xp_allocation.achievements)) {
      const userProgress = user.achievements[key] || 0;
      for (const [stage, xp] of Object.entries(stages)) {
        if (userProgress >= Number(stage)) {
          user.xp += xp;
        }
      }
    }

    // Check badges
    for (const [badge, criteria] of Object.entries(this.config.badges)) {
      if (!user.badges.find(b => b.name === badge)) {
        let meetsCriteria = true;
        for (const [key, value] of Object.entries(criteria.criteria)) {
          if (user.achievements[key] < value) {
            meetsCriteria = false;
            break;
          }
        }
        if (meetsCriteria) {
          user.badges.push({ name: badge, date: new Date() });
        }
      }
    }

    // Update level
    const levels = this.config.levels;
    for (const [level, xp] of Object.entries(levels)) {
      if (user.xp >= xp) {
        user.level = Number(level);
      }
    }
  }

  async resetStreaks(userId: Types.ObjectId): Promise<void> {
    const user = await this.userModel.findById(userId);

    if (user) {
      user.daily_streak = 0;
      user.weekly_streak = 0;
      await user.save();
    }
  }
}