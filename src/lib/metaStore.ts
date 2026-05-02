import { supabase } from './supabase';

export interface MetaProfileRow {
  user_id: string;
  premium_active: boolean;
  premium_source: string | null;
  premium_until: string | null;
  current_circuit_id: string | null;
  gold_balance: number;
  fragment_balance: number;
}

export interface UserCircuitProgressRow {
  circuit_id: string;
  premium_unlocked: boolean;
  season_runs_completed: number;
  matches_played: number;
  season_reports_opened: number;
  training_actions: number;
  tactical_changes: number;
  reward_claims: unknown[];
}

export interface UserInventoryRow {
  item_id: string;
  is_equipped: boolean;
  equipped_context: Record<string, unknown>;
}

export interface MetaStoreSnapshot {
  profile: MetaProfileRow | null;
  circuit: UserCircuitProgressRow | null;
  inventory: UserInventoryRow[];
}

export const ensureUserMeta = async () => {
  const { error } = await supabase.rpc('ensure_user_meta');
  if (error) throw error;
};

export const loadMetaStoreSnapshot = async (): Promise<MetaStoreSnapshot> => {
  await ensureUserMeta();

  const [{ data: profile, error: profileError }, { data: inventory, error: inventoryError }] = await Promise.all([
    supabase
      .from('profiles_meta')
      .select('user_id,premium_active,premium_source,premium_until,current_circuit_id,gold_balance,fragment_balance')
      .maybeSingle(),
    supabase
      .from('user_inventory')
      .select('item_id,is_equipped,equipped_context')
      .order('created_at', { ascending: true }),
  ]);

  if (profileError) throw profileError;
  if (inventoryError) throw inventoryError;

  let circuit: UserCircuitProgressRow | null = null;
  if (profile?.current_circuit_id) {
    const { data: circuitRow, error: circuitError } = await supabase
      .from('user_circuit_progress')
      .select('circuit_id,premium_unlocked,season_runs_completed,matches_played,season_reports_opened,training_actions,tactical_changes,reward_claims')
      .eq('circuit_id', profile.current_circuit_id)
      .maybeSingle();

    if (circuitError) throw circuitError;
    circuit = circuitRow;
  }

  return {
    profile: profile || null,
    circuit,
    inventory: inventory || [],
  };
};

export const purchaseCatalogItemWithBalance = async (itemId: string) => {
  const { data, error } = await supabase.rpc('purchase_catalog_item_with_balance', {
    p_item_id: itemId,
  });

  if (error) throw error;
  return data as { ok: boolean; reason?: string; itemId?: string; currency?: string; price?: number };
};

export const grantSeasonCompletionRewards = async (
  season: number,
  gold: number,
  fragments: number,
  reason: Record<string, unknown>
) => {
  const { data, error } = await supabase.rpc('grant_season_completion_rewards', {
    p_season: season,
    p_gold: gold,
    p_fragments: fragments,
    p_reason: reason,
  });

  if (error) throw error;
  return data as {
    ok: boolean;
    reason?: string;
    season?: number;
    gold?: number;
    fragments?: number;
    premiumBonusFragments?: number;
  };
};
