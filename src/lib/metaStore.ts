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

export interface ManagerProfileMetaRow {
  user_id: string;
  display_name: string;
  preferred_play_style: string;
  evolution: number;
  negotiation: number;
  scout: number;
  origin_trait_id: string;
  owned_trait_ids: string[];
  equipped_trait_ids: string[];
  career_titles_total: number;
  worlds_played: number;
}

export interface MetaStoreSnapshot {
  profile: MetaProfileRow | null;
  circuit: UserCircuitProgressRow | null;
  inventory: UserInventoryRow[];
  managerProfile: ManagerProfileMetaRow | null;
}

export const ensureUserMeta = async () => {
  const { error } = await supabase.rpc('ensure_user_meta');
  if (error) throw error;
};

export const ensureManagerProfileMeta = async () => {
  const { error } = await supabase.rpc('ensure_manager_profile_meta');
  if (error) throw error;
};

export const loadManagerProfileMeta = async (): Promise<ManagerProfileMetaRow | null> => {
  await ensureManagerProfileMeta();

  const { data, error } = await supabase
    .from('manager_profiles_meta')
    .select('user_id,display_name,preferred_play_style,evolution,negotiation,scout,origin_trait_id,owned_trait_ids,equipped_trait_ids,career_titles_total,worlds_played')
    .maybeSingle();

  if (error) throw error;
  return data || null;
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

  let managerProfile: ManagerProfileMetaRow | null = null;
  try {
    managerProfile = await loadManagerProfileMeta();
  } catch (error) {
    console.warn('metaStore: manager profile meta unavailable', error);
  }

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
    managerProfile,
  };
};

export const syncManagerProfileMeta = async (payload: {
  displayName?: string | null;
  preferredPlayStyle?: string | null;
  evolution?: number | null;
  negotiation?: number | null;
  scout?: number | null;
  originTraitId?: string | null;
  ownedTraitIds?: string[] | null;
  equippedTraitIds?: string[] | null;
  careerTitlesTotal?: number | null;
  worldsPlayed?: number | null;
}) => {
  const { data, error } = await supabase.rpc('upsert_manager_profile_meta', {
    p_display_name: payload.displayName ?? null,
    p_preferred_play_style: payload.preferredPlayStyle ?? null,
    p_evolution: payload.evolution ?? null,
    p_negotiation: payload.negotiation ?? null,
    p_scout: payload.scout ?? null,
    p_origin_trait_id: payload.originTraitId ?? null,
    p_owned_trait_ids: payload.ownedTraitIds ?? null,
    p_equipped_trait_ids: payload.equippedTraitIds ?? null,
    p_career_titles_total: payload.careerTitlesTotal ?? null,
    p_worlds_played: payload.worldsPlayed ?? null,
  });

  if (error) throw error;
  return data as ManagerProfileMetaRow;
};

export const purchaseCatalogItemWithBalance = async (itemId: string) => {
  const { data, error } = await supabase.rpc('purchase_catalog_item_with_balance', {
    p_item_id: itemId,
  });

  if (error) throw error;
  return data as { ok: boolean; reason?: string; itemId?: string; currency?: string; price?: number };
};

export const updateProfileDisplaySlots = async (itemIds: string[], allowedItemIds: string[]) => {
  await ensureUserMeta();

  const allowedSet = new Set(allowedItemIds);
  const safeItemIds = itemIds.filter(itemId => allowedSet.has(itemId)).slice(0, 3);

  const { error: clearError } = await supabase
    .from('user_inventory')
    .update({ is_equipped: false, equipped_context: {} })
    .in('item_id', allowedItemIds);

  if (clearError) throw clearError;

  await Promise.all(safeItemIds.map((itemId, index) =>
    supabase
      .from('user_inventory')
      .update({
        is_equipped: true,
        equipped_context: {
          context: 'profile_display',
          slot: index + 1,
        },
      })
      .eq('item_id', itemId)
  )).then(results => {
    const error = results.find(result => result.error)?.error;
    if (error) throw error;
  });

  return safeItemIds;
};

export const grantMobilePurchase = async (
  productCode: string,
  options: {
    purchaseToken?: string | null;
    orderId?: string | null;
    platform?: string;
    packageName?: string | null;
    purchaseState?: string | null;
    expiresAt?: string | null;
    rawPayload?: Record<string, unknown>;
  } = {}
) => {
  void productCode;
  void options;
  throw new Error('MOBILE_PURCHASE_GRANT_REQUIRES_SERVER_VERIFICATION');
};

export const verifyGooglePlayPurchase = async (
  productCode: string,
  options: {
    productId: string;
    purchaseToken?: string | null;
    orderId?: string | null;
    packageName?: string | null;
    purchaseState?: string | null;
    rawPayload?: Record<string, unknown>;
  }
) => {
  const { data, error } = await supabase.functions.invoke('verify-google-play-purchase', {
    body: {
      productCode,
      productId: options.productId,
      purchaseToken: options.purchaseToken,
      orderId: options.orderId,
      packageName: options.packageName,
      purchaseState: options.purchaseState,
      rawPayload: options.rawPayload || {},
    },
  });

  if (error) throw error;
  return data as {
    ok: boolean;
    reason?: string;
    productCode?: string;
    productId?: string;
    kind?: 'consumable' | 'entitlement';
    grant?: {
      ok?: boolean;
      reason?: string;
      premium?: boolean;
      premiumUntil?: string;
      gold?: number;
      fragments?: number;
    };
  };
};

export const deleteCurrentAccount = async () => {
  const { data, error } = await supabase.functions.invoke('delete-account', {
    body: { confirm: true },
  });

  if (error) throw error;
  return data as { ok: boolean; reason?: string };
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
