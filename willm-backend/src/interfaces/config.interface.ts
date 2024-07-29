interface Config {
  xp_allocation: {
    daily_login: number;
    correct_answer: number;
    max_score_bonus: number;
    achievements: {
      quizzes_completed: Record<string, number>;
      correct_answers: Record<string, number>;
      weekly_streaks: Record<string, number>;
      consecutive_days: Record<string, number>;
    };
  };
  badges: {
    [key: string]: {
      criteria: {
        [key: string]: number;
      };
    };
  };
  levels: {
    [key: string]: number;
  };
}