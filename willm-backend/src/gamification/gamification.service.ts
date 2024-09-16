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
          "1": 100,
          "3": 200,
          "5": 300,
        },
        correct_answers: {
          "5": 100,
          "10": 200,
          "20": 300,
        },
        max_weekly_streaks: {
          "1": 100,
          "2": 200,
          "3": 300,
          "4": 400,
        },
        max_consecutive_days: {
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
          quizzes_completed: 1,
        },
      },
      pro: {
        criteria: {
          quizzes_completed: 3,
          max_consecutive_days: 5,
          correct_answers: 10,
        },
      },
      leader: {
        criteria: {
          quizzes_completed: 4,
          correct_answers: 15,
          max_weekly_streaks: 1,
        },
      },
      guru: {
        criteria: {
          quizzes_completed: 5,
          correct_answers: 20,
        },
      },
    },
    levels: {
      "0": 0,
      "1": 100,
      "2": 300,
      "3": 600,
      "4": 1000,
      "5": 1500,
      "6": 2100,
      "7": 2800,
      "8": 3600,
      "9": 4500,
      "10": 5500
    }
  };

  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async handleLogin(userId: Types.ObjectId): Promise<void> {
    const user = await this.userModel.findById(userId);
    const now = new Date();
    const lastLoginDate = new Date(user.last_login);

    const isSameDay = lastLoginDate.toDateString() === now.toDateString();

    if (!isSameDay) {
      const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const lastLoginDateOnly = new Date(lastLoginDate.getFullYear(), lastLoginDate.getMonth(), lastLoginDate.getDate()).getTime();
      const diffInDays = (nowDate - lastLoginDateOnly) / (1000 * 60 * 60 * 24);

      if (diffInDays === 1) {
          user.daily_streak += 1;

          // Update max consecutive days
          if (user.daily_streak > user.achievements.max_consecutive_days) {
              user.achievements.max_consecutive_days = user.daily_streak;
          }
      } else {
          user.daily_streak = 1;
          user.weekly_streak = 0;
      }

      if (user.daily_streak % 7 === 0) {
          user.weekly_streak += 1;
          // Update max weekly streaks
          if (user.weekly_streak > user.achievements.max_weekly_streaks) {
              user.achievements.max_weekly_streaks = user.weekly_streak;
          }
      }

      user.markModified('achievements.max_consecutive_days');
      user.markModified('achievements.max_weekly_streaks');

      user.last_login = now;
      user.xp += this.getXPForAction('daily_login');
      await this.checkAchievementsAndBadges(user);
      await user.save();
    }
  }

  async handleQuizCompletion(userId: Types.ObjectId, score: number): Promise<void> {
    const user = await this.userModel.findById(userId);

    if(score === 5) {
      user.xp += this.getXPForAction('max_score_bonus');
    }

    // Update achievements
    user.achievements.quizzes_completed = (user.achievements.quizzes_completed || 0) + 1;

    user.markModified('achievements.quizzes_completed');

    await this.checkAchievementsAndBadges(user);
    await user.save();
  }

  async handleCorrectAnswer(userId: Types.ObjectId): Promise<void> {
    const user = await this.userModel.findById(userId);

    // Update correct answers count
    user.achievements.correct_answers = (user.achievements.correct_answers || 0) + 1;

    // Grant XP for a correct answer
    user.xp += this.getXPForAction('correct_answer');

    user.markModified('achievements.correct_answers');

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
      const rewardedStages = user.rewarded_achievements[key] || [];

      for (const [stage, xp] of Object.entries(stages)) {
        const stageNumber = Number(stage);
        console.log("Checking achievement", key, "stage", stage, "userProgress", userProgress, "rewardedStages", rewardedStages);

        // Grant XP only if the stage has been reached and XP hasn't been rewarded yet
        if (userProgress >= stageNumber && !rewardedStages.includes(stageNumber)) {
          console.log("Granting XP for achievement", key, "stage", stage);
          user.xp += xp;

          // Add the stage to the rewarded achievements list
          rewardedStages.push(stageNumber);
          user.rewarded_achievements[key] = rewardedStages;
        }
      }
    }

    // Check badges
    let badgesModified = false;
    for (const [badge, criteria] of Object.entries(this.config.badges)) {
      if (!user.badges.find(b => b.name === badge)) {
        let meetsCriteria = true;
        for (const [key, value] of Object.entries(criteria.criteria)) {
          if ((user.achievements[key] || 0) < value) {
            meetsCriteria = false;
            break;
          }
        }
        if (meetsCriteria) {
          user.badges.push({ name: badge, date: new Date() });
          badgesModified = true;
        }
      }
    }

    // Update level
    const levels = this.config.levels;
    let newLevel = 0;
    for (const [level, xp] of Object.entries(levels)) {
      if (user.xp >= xp) {
        newLevel = Number(level);
      } else {
        break;
      }
    }
    user.level = newLevel;

    // Mark fields as modified if needed
    if (badgesModified) {
      user.markModified('badges');
    }
    
    // Mark rewarded_achievements as modified if it has been updated
    user.markModified('rewarded_achievements');
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
