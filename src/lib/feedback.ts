import { supabase } from './supabase';

export type FeedbackCategory = 'bug' | 'confusing' | 'balance' | 'visual' | 'other';

export interface FeedbackReportInput {
  worldId?: string | null;
  currentTab: string;
  currentDay?: number;
  currentSeason?: number;
  userTeamId?: string | null;
  userManagerId?: string | null;
  category: FeedbackCategory;
  message: string;
}

export const submitFeedbackReport = async (input: FeedbackReportInput) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('not_authenticated');

  const { error } = await supabase
    .from('feedback_reports')
    .insert({
      user_id: user.id,
      world_id: input.worldId || null,
      user_team_id: input.userTeamId || null,
      user_manager_id: input.userManagerId || null,
      current_tab: input.currentTab,
      current_day: input.currentDay ?? null,
      current_season: input.currentSeason ?? null,
      category: input.category,
      message: input.message.trim(),
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      url: typeof window !== 'undefined' ? window.location.href : null
    });

  if (error) throw error;
};
