import React, { useEffect, useMemo, useState } from 'react';
import { useGame, useGameState, useGameDispatch } from '../../store/GameContext';
import { useDashboardData } from '../../hooks/useDashboardData';
import { useMatchSimulation } from '../../hooks/useMatchSimulation';
import { useTransfers } from '../../hooks/useTransfers';
import { useTactics } from '../../hooks/useTactics';
import { useTraining } from '../../hooks/useTraining';
import { useGameDay } from '../../hooks/useGameDay';
import { PlayerCard } from '../PlayerCard';
import { PlayerModal } from '../PlayerModal';
import { HairCalibrationPanel } from '../HairCalibrationPanel';
import { TeamLogo } from '../TeamLogo';
import { LineupBuilder } from '../LineupBuilder';
import { LiveReport, PostGameReport } from '../MatchReports';
import { ManagerProfileHub } from '../ManagerProfileHub';
import { getMatchStatus } from '../../utils/matchUtils';
import { Player, StoreItem } from '../../types';
import { APP_CIRCUIT, STORE_ITEMS } from '../../constants/storeCatalog';
import { MANAGER_TRAITS_BY_ID, STARTER_MANAGER_TRAITS, type ManagerTrait } from '../../constants/managerTraits';
import { BILLING_CATALOG, GOLD_PACKS, getBillingProduct, type BillingCatalogEntry } from '../../constants/billingCatalog';
import { addGoldToStore, equipManagerItem, equipTeamKit, equipTeamLogo, getStoreState, isItemOwned, purchaseStoreItem } from '../../utils/store';
import {
  isHapticsEnabled,
  isInitialHelpEnabled,
  isMatchNotificationsEnabled,
  isSoundEnabled,
  setHapticsEnabled as persistHapticsEnabled,
  setInitialHelpEnabled as persistInitialHelpEnabled,
  setMatchNotificationsEnabled as persistMatchNotificationsEnabled,
  setSoundEnabled as persistSoundEnabled
} from '../../utils/uiFeedback';
import { cancelScheduledMatchNotification, requestMatchNotificationPermission } from '../../utils/matchNotifications';
import { deleteCurrentAccount, loadMetaStoreSnapshot, purchaseCatalogItemWithBalance, syncManagerProfileMeta, updateProfileDisplaySlots, verifyGooglePlayPurchase, type MetaStoreSnapshot } from '../../lib/metaStore';
import { canUseDevBillingPreview, formatBrl, getBillingReadinessCopy, getCheckoutChannelLabel, getNativeProductId, startNativeProductPurchase } from '../../lib/billing';
import { buildManagerProfilePayload } from '../../utils/managerProfile';
import * as LucideIcons from 'lucide-react';
const { Home, Trophy, ShoppingCart, Database, User, Clock, Newspaper, TrendingUp, AlertCircle, Award, Calendar, Users, Activity, Sliders, Flame, Target, Zap, FastForward, Globe, MessageSquare, AlertTriangle, TrendingDown, Briefcase, Star, Search, Crown, ChevronRight, Lock, ChevronDown, Eye, Shield, Brain, X, Save, Play, Copy, Coins, Trash2 } = LucideIcons;


export const CareerTab = (props: any) => {
  const { saveGame } = useGame();
  const { setState, addToast, togglePause, logout, requestConfirm } = useGameDispatch();
  const { state, isPaused, worldId } = useGameState();
  const canUseDevTools = import.meta.env.DEV;
  const dashData = useDashboardData();
  const { userTeam, upcomingMatches } = dashData;
  const {
    handleStartReport,
    handleMockReport,
    selectedMatchReport,
    setSelectedMatchReport,
    isWatchingReport,
    setIsWatchingReport,
    reportSecond,
    setReportSecond
  } = useMatchSimulation(userTeam?.id || null);
  const { handleUpdateTactics } = useTactics(userTeam?.id || null);
  const { handleSetFocus, handleStartCardLab, handleChemistryBoost } = useTraining(userTeam?.id || null);
  const { handleStartNewSeason } = useGameDay();
  const [isCareerModalOpen, setIsCareerModalOpen] = useState(false);
  const [gmRandomPlayer, setGmRandomPlayer] = useState<Player | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [careerSection, setCareerSection] = useState<'store' | 'inventory' | 'circuit' | 'profile' | 'settings'>('store');
  const [selectedStoreItem, setSelectedStoreItem] = useState<StoreItem | null>(null);
  const [selectedGoldPack, setSelectedGoldPack] = useState<BillingCatalogEntry | null>(null);
  const [isBillingBusy, setIsBillingBusy] = useState(false);
  const [metaSnapshot, setMetaSnapshot] = useState<MetaStoreSnapshot | null>(null);
  const [isMetaLoading, setIsMetaLoading] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => isSoundEnabled());
  const [hapticsEnabled, setHapticsEnabled] = useState(() => isHapticsEnabled());
  const [initialHelpEnabled, setInitialHelpEnabled] = useState(() => isInitialHelpEnabled());
  const [matchNotificationsEnabled, setMatchNotificationsEnabled] = useState(() => isMatchNotificationsEnabled());
  const store = getStoreState(state);
  const { isAuthenticated, worlds } = useGameState();
  const shopBoots = STORE_ITEMS.filter(item => item.category === 'BOOT');
  const shopKits = STORE_ITEMS.filter(item => item.category === 'KIT');
  const shopLogos = STORE_ITEMS.filter(item => item.category === 'LOGO');
  const shopProfileItems = STORE_ITEMS.filter(item => item.category === 'ACCESSORY' || item.category === 'BADGE');
  const userManager = state.userManagerId ? state.managers[state.userManagerId] : null;
  const isBeforeKickoff = state.world.status === 'LOBBY' && state.world.currentDay < 0;
  const worldClockDisplayDate = useMemo(() => {
    const baseDate = new Date(
      state.world.status === 'LOBBY' && state.world.startScheduledAt
        ? state.world.startScheduledAt
        : state.world.currentDate
    );
    const now = new Date();
    return new Date(
      now.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate(),
      baseDate.getHours(),
      baseDate.getMinutes(),
      0,
      0
    );
  }, [state.world.currentDate, state.world.startScheduledAt, state.world.status]);
  const worldSeasonDay = state.world.currentDay < 0 ? 0 : state.world.currentDay + 1;
  const seasonRewardRows = [
    { label: 'Completar temporada', gold: 40, fragments: 2 },
    { label: 'Abrir season report', gold: 10, fragments: 0 },
    { label: 'Fechar sem abandonar clube', gold: 10, fragments: 0 },
    { label: 'Top 4 da liga', gold: 15, fragments: 0 },
    { label: 'Campeao da liga', gold: 35, fragments: 3 },
    { label: 'Campeao da copa', gold: 25, fragments: 2 },
    { label: 'Tecnico ou jogador destaque', gold: 10, fragments: 0 },
    { label: 'Premium ativo no fechamento', gold: 0, fragments: 4 },
  ];

  const refreshMetaSnapshot = async () => {
    if (!isAuthenticated) {
      setMetaSnapshot(null);
      return;
    }

    try {
      setIsMetaLoading(true);
      const snapshot = await loadMetaStoreSnapshot();
      setMetaSnapshot(snapshot);
    } catch (error) {
      console.error('CareerTab: failed to load meta snapshot', error);
      addToast('Nao foi possivel carregar premium e inventario', 'warning');
    } finally {
      setIsMetaLoading(false);
    }
  };

  useEffect(() => {
    refreshMetaSnapshot();
  }, [isAuthenticated]);

  const remoteOwnedItemIds = useMemo(
    () => new Set((metaSnapshot?.inventory || []).map(item => item.item_id)),
    [metaSnapshot]
  );

  const isOwnedInView = (itemId: string) => (
    isAuthenticated ? remoteOwnedItemIds.has(itemId) : isItemOwned(state, itemId)
  );

  const viewGoldBalance = isAuthenticated ? (metaSnapshot?.profile?.gold_balance ?? store.gold) : store.gold;
  const viewFragmentBalance = isAuthenticated ? (metaSnapshot?.profile?.fragment_balance ?? store.fragments) : store.fragments;
  const viewCircuit = {
    premiumActive: isAuthenticated ? (metaSnapshot?.profile?.premium_active ?? store.circuit.premiumActive) : store.circuit.premiumActive,
    seasonRunsCompleted: isAuthenticated ? (metaSnapshot?.circuit?.season_runs_completed ?? store.circuit.seasonRunsCompleted) : store.circuit.seasonRunsCompleted,
    targetSeasonRuns: store.circuit.targetSeasonRuns,
  };

  const ownedItems = STORE_ITEMS.filter(item => isOwnedInView(item.id));
  const ownedProfileItems = ownedItems.filter(item => item.category === 'ACCESSORY' || item.category === 'BADGE');
  const remoteEquippedManagerItemIds = useMemo(() => {
    const profileItemIds = new Set(shopProfileItems.map(item => item.id));
    return (metaSnapshot?.inventory || [])
      .filter(row => row.is_equipped && profileItemIds.has(row.item_id))
      .sort((a, b) => Number(a.equipped_context?.slot || 99) - Number(b.equipped_context?.slot || 99))
      .map(row => row.item_id)
      .slice(0, 3);
  }, [metaSnapshot?.inventory, shopProfileItems]);
  const visibleManagerItemIds = isAuthenticated ? remoteEquippedManagerItemIds : store.equippedManagerItemIds;
  const equippedManagerItems = visibleManagerItemIds
    .map(itemId => STORE_ITEMS.find(item => item.id === itemId))
    .filter((item): item is StoreItem => !!item);
  const equippedManagerItemIds = new Set(equippedManagerItems.map(item => item.id));
  const ownedManagerTraitIds = userManager?.ownedTraitIds?.length
    ? userManager.ownedTraitIds
    : (userManager?.originTraitId ? [userManager.originTraitId] : []);
  const equippedManagerTraitIds = userManager?.equippedTraitIds?.length
    ? userManager.equippedTraitIds
    : ownedManagerTraitIds.slice(0, 1);
  const ownedManagerTraits = ownedManagerTraitIds
    .map(traitId => MANAGER_TRAITS_BY_ID[traitId] || STARTER_MANAGER_TRAITS.find(trait => trait.id === traitId))
    .filter((trait): trait is ManagerTrait => !!trait);
  const highRarityOwnedItems = ownedItems.filter(item => ['RARE', 'EPIC', 'LEGENDARY'].includes(item.rarity));
  const profileHonorScore = Math.round(
    (userManager?.career.titlesWon || 0) * 18 +
    (userManager?.career.hallOfFameEntries || 0) * 35 +
    (viewCircuit.seasonRunsCompleted || 0) * 12 +
    highRarityOwnedItems.length * 7 +
    ownedProfileItems.length * 14 +
    equippedManagerTraitIds.reduce((sum, traitId) => sum + (MANAGER_TRAITS_BY_ID[traitId]?.influence || 0), 0)
  );
  const profileTier = profileHonorScore >= 220 ? 'Lenda urbana' : profileHonorScore >= 120 ? 'Nome respeitado' : profileHonorScore >= 45 ? 'Em ascensao' : 'Primeiros passos';

  const handleSimulateGameReport = (mode: 'live' | 'finished') => {
    handleMockReport(mode, "MANCHETE GM: Escândalo em Neo-City! Time mockado vence de goleada histórica!");
  };

  const handleOpenRandomPlayer = () => {
    // Generate a random player from the state for preview
    const playerIds = Object.keys(state.players);
    if (playerIds.length > 0) {
      const randomId = playerIds[Math.floor(Math.random() * playerIds.length)];
      setGmRandomPlayer(state.players[randomId]);
    }
  };

  const worldJoinCode = state.world.access?.joinCode || (worldId ? `ELITE-${worldId.slice(-6)}` : 'ELITE-LOCAL');
  const handleCopyJoinCode = async () => {
    try {
      await navigator.clipboard.writeText(worldJoinCode);
      addToast('Codigo do mundo copiado', 'success');
    } catch {
      addToast(`Codigo do mundo: ${worldJoinCode}`, 'info');
    }
  };

  const updateSoundEnabled = (enabled: boolean) => {
    setSoundEnabled(enabled);
    persistSoundEnabled(enabled);
    addToast(enabled ? 'Sons ligados.' : 'Sons desligados.', 'success');
  };

  const updateHapticsEnabled = (enabled: boolean) => {
    setHapticsEnabled(enabled);
    persistHapticsEnabled(enabled);
    addToast(enabled ? 'Vibracao ligada.' : 'Vibracao desligada.', 'success');
  };

  const updateInitialHelpEnabled = (enabled: boolean) => {
    setInitialHelpEnabled(enabled);
    persistInitialHelpEnabled(enabled);
    addToast(enabled ? 'Ajuda inicial ativada. As dicas voltam a aparecer.' : 'Ajuda inicial ocultada.', 'success');
  };

  const updateMatchNotificationsEnabled = async (enabled: boolean) => {
    if (!enabled) {
      setMatchNotificationsEnabled(false);
      persistMatchNotificationsEnabled(false);
      await cancelScheduledMatchNotification();
      addToast('Alertas de jogo desligados.', 'success');
      return;
    }

    const permission = await requestMatchNotificationPermission();
    if (!permission.granted) {
      setMatchNotificationsEnabled(false);
      persistMatchNotificationsEnabled(false);
      addToast('Permissao de notificacao nao liberada no aparelho.', 'warning');
      return;
    }

    setMatchNotificationsEnabled(true);
    persistMatchNotificationsEnabled(true);
    addToast('Alertas de jogo ligados. Aviso 2h antes da partida.', 'success');
  };

  const handleDeleteAccount = async () => {
    if (!isAuthenticated) {
      addToast('Entre na conta antes de solicitar exclusao.', 'warning');
      return;
    }

    const confirmed = await requestConfirm({
      title: 'Excluir conta',
      message: 'Isto apaga sua conta Elite 50 e os dados online vinculados a ela. Essa acao nao pode ser desfeita.',
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
      tone: 'danger',
    });

    if (!confirmed) return;

    setIsDeletingAccount(true);
    try {
      const result = await deleteCurrentAccount();
      if (!result?.ok) {
        addToast(result?.reason || 'Nao foi possivel excluir a conta agora.', 'error');
        return;
      }

      addToast('Conta excluida com sucesso.', 'success');
      await logout();
    } catch (error) {
      console.error('CareerTab: delete account failed', error);
      addToast('Erro ao excluir conta. Tente novamente em instantes.', 'error');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleBuyStoreItem = async (itemId: string) => {
    if (isAuthenticated) {
      try {
        const result = await purchaseCatalogItemWithBalance(itemId);
        if (!result?.ok) {
          const reasonMap: Record<string, string> = {
            ALREADY_OWNED: 'Item ja esta no inventario.',
            INSUFFICIENT_GOLD: 'Ouro insuficiente.',
            INSUFFICIENT_FRAGMENT: 'Fragmentos insuficientes.',
            PREMIUM_REQUIRED: 'Esse item precisa do Passe do Circuito.',
          };
          addToast(reasonMap[result?.reason || ''] || 'Nao foi possivel concluir a compra.', 'warning');
          return;
        }

        await refreshMetaSnapshot();
        setState(prev => {
          const currentStore = getStoreState(prev);
          return {
            ...prev,
            store: {
              ...currentStore,
              ownedItemIds: Array.from(new Set([...currentStore.ownedItemIds, itemId])),
            },
          };
        });
        addToast('Item comprado com sucesso.', 'success');
        return;
      } catch (error) {
        console.error('CareerTab: remote purchase failed', error);
        addToast('Erro ao comprar item no inventario online.', 'error');
        return;
      }
    }

    const result = purchaseStoreItem(state, itemId);
    if (!result.ok) {
      addToast(result.message, 'warning');
      return;
    }

    setState(result.state);
    await saveGame(result.state);
    addToast(result.message, 'success');
  };

  const handleBillingCheckout = async (pack: BillingCatalogEntry) => {
    if (isBillingBusy) return;
    setIsBillingBusy(true);
    try {
      const canPreview = canUseDevBillingPreview();
      if (!canPreview) {
        if (!isAuthenticated) {
          addToast('Entre com Google antes de comprar.', 'warning');
          return;
        }

        const nativeResult = await startNativeProductPurchase(pack);
        if (nativeResult.purchaseState === 'pending') {
          addToast('Compra pendente na Google Play. Assim que aprovar, tente restaurar/abrir a loja para conciliar.', 'warning');
          return;
        }

        if (!nativeResult.ok) {
          const productId = getNativeProductId(pack);
          const message = nativeResult.reason === 'NATIVE_BILLING_BRIDGE_MISSING'
            ? `Produto nativo ${productId} esta mapeado, mas o bridge Android nao respondeu.`
            : nativeResult.reason === 'WEB_RUNTIME'
              ? 'Compra real exige Android + Google Play.'
              : `Nao foi possivel concluir a compra ${productId} na Google Play.`;
          addToast(message, 'warning');
          return;
        }

        if (nativeResult.platform !== 'android') {
          addToast('Compra real ainda esta liberada apenas no Android/Google Play.', 'warning');
          return;
        }

        const result = await verifyGooglePlayPurchase(pack.code, {
              productId: nativeResult.productId,
              purchaseToken: nativeResult.purchaseToken,
              orderId: nativeResult.orderId,
              packageName: nativeResult.packageName,
              purchaseState: nativeResult.purchaseState,
              rawPayload: nativeResult.rawPayload,
            });

        const grant = result.grant;
        if (!result?.ok || !grant?.ok) {
          addToast(result?.reason || grant?.reason || 'Nao foi possivel validar a compra nativa.', 'warning');
          return;
        }

        await refreshMetaSnapshot();
        addToast(pack.kind === 'entitlement' ? 'Passe ativado no perfil.' : `${pack.amountLabel} creditado no perfil.`, 'success');
        setSelectedGoldPack(null);
        return;
      }

      if (isAuthenticated) {
        addToast('Preview web nao credita perfil online. Compra real exige Android + Google Play.', 'info');
      } else {
        const nextState = pack.goldAmount
          ? addGoldToStore(state, pack.goldAmount)
          : {
              ...state,
              store: {
                ...store,
                circuit: {
                  ...store.circuit,
                  premiumActive: true,
                },
              },
            };
        setState(nextState);
        await saveGame(nextState);
        addToast(pack.kind === 'entitlement' ? 'Passe ativado neste save local de teste.' : `${pack.amountLabel} creditado neste save local de teste.`, 'success');
      }

      setSelectedGoldPack(null);
    } catch (error) {
      console.error('CareerTab: billing checkout failed', error);
      addToast('Falha ao processar compra.', 'error');
    } finally {
      setIsBillingBusy(false);
    }
  };

  const handleEquipKit = async (itemId: string) => {
    if (!userTeam) return;
    const nextState = equipTeamKit(state, userTeam.id, itemId);
    setState(nextState);
    await saveGame(nextState);
    addToast('Uniforme especial aplicado ao clube.', 'success');
  };

  const handleEquipLogo = async (itemId: string) => {
    if (!userTeam) return;
    const nextState = equipTeamLogo(state, userTeam.id, itemId);
    setState(nextState);
    await saveGame(nextState);
    addToast('Logo especial aplicado ao clube.', 'success');
  };

  const handleEquipManagerItem = async (itemId: string) => {
    if (isAuthenticated) {
      const item = STORE_ITEMS.find(storeItem => storeItem.id === itemId);
      if (!item || (item.category !== 'ACCESSORY' && item.category !== 'BADGE')) {
        addToast('Item de manager invalido.', 'warning');
        return;
      }

      if (!isOwnedInView(item.id)) {
        addToast('Compre o item primeiro.', 'warning');
        return;
      }

      try {
        const isEquipped = equippedManagerItemIds.has(item.id);
        let nextIds = visibleManagerItemIds.filter(id => id !== item.id);
        if (!isEquipped) {
          if (nextIds.length >= 3) nextIds = nextIds.slice(1);
          nextIds = [...nextIds, item.id];
        }

        await updateProfileDisplaySlots(nextIds, shopProfileItems.map(profileItem => profileItem.id));
        await refreshMetaSnapshot();
        addToast(isEquipped ? `${item.name} removido da exibicao.` : `${item.name} exibido no perfil.`, 'success');
      } catch (error) {
        console.error('CareerTab: failed to update profile display slots', error);
        addToast('Nao foi possivel atualizar a exibicao do perfil.', 'error');
      }
      return;
    }

    const result = equipManagerItem(state, itemId);
    if (!result.ok) {
      addToast(result.message, 'warning');
      return;
    }

    setState(result.state);
    await saveGame(result.state);
    addToast(result.message, 'success');
  };

  const handleToggleManagerTrait = async (traitId: string) => {
    if (!userManager || !state.userManagerId) return;

    const currentOwned = ownedManagerTraitIds.includes(traitId)
      ? ownedManagerTraitIds
      : [...ownedManagerTraitIds, traitId];
    const isEquipped = equippedManagerTraitIds.includes(traitId);
    const nextEquipped = isEquipped
      ? equippedManagerTraitIds.filter(id => id !== traitId)
      : [...equippedManagerTraitIds.slice(-1), traitId];
    const nextManager = {
      ...userManager,
      ownedTraitIds: currentOwned,
      equippedTraitIds: nextEquipped,
    };
    const nextState = {
      ...state,
      managers: {
        ...state.managers,
        [state.userManagerId]: nextManager,
      },
    };

    setState(nextState);
    await saveGame(nextState);
    await syncManagerProfileMeta(buildManagerProfilePayload(nextManager)).catch(() => undefined);
    addToast(isEquipped ? 'Trait removido deste mundo.' : 'Trait equipado neste mundo.', 'success');
  };

  const handleStoreItemAction = async (item: StoreItem) => {
    const owned = isOwnedInView(item.id);

    if (!owned) {
      await handleBuyStoreItem(item.id);
      return;
    }

    if (item.category === 'KIT') {
      await handleEquipKit(item.id);
      return;
    }

    if (item.category === 'LOGO') {
      await handleEquipLogo(item.id);
      return;
    }

    if (item.category === 'ACCESSORY' || item.category === 'BADGE') {
      await handleEquipManagerItem(item.id);
      setSelectedStoreItem(null);
      return;
    }

    setSelectedStoreItem(null);
  };

  const getStoreRarityStyle = (rarity: StoreItem['rarity']) => {
    switch (rarity) {
      case 'LEGENDARY':
        return {
          glow: 'shadow-[0_0_35px_rgba(245,158,11,0.25)]',
          border: 'border-amber-400/35',
          badge: 'text-amber-100 bg-amber-500/15 border-amber-400/30',
          gradient: 'from-amber-500/18 via-slate-900 to-black',
          accent: 'text-amber-200',
        };
      case 'EPIC':
        return {
          glow: 'shadow-[0_0_35px_rgba(168,85,247,0.24)]',
          border: 'border-fuchsia-400/35',
          badge: 'text-fuchsia-100 bg-fuchsia-500/15 border-fuchsia-400/30',
          gradient: 'from-fuchsia-500/18 via-slate-900 to-black',
          accent: 'text-fuchsia-200',
        };
      case 'RARE':
        return {
          glow: 'shadow-[0_0_35px_rgba(34,211,238,0.22)]',
          border: 'border-cyan-400/35',
          badge: 'text-cyan-100 bg-cyan-500/15 border-cyan-400/30',
          gradient: 'from-cyan-500/18 via-slate-900 to-black',
          accent: 'text-cyan-200',
        };
      case 'UNCOMMON':
        return {
          glow: 'shadow-[0_0_30px_rgba(74,222,128,0.18)]',
          border: 'border-emerald-400/30',
          badge: 'text-emerald-100 bg-emerald-500/12 border-emerald-400/25',
          gradient: 'from-emerald-500/14 via-slate-900 to-black',
          accent: 'text-emerald-200',
        };
      default:
        return {
          glow: 'shadow-[0_0_25px_rgba(148,163,184,0.16)]',
          border: 'border-slate-400/20',
          badge: 'text-slate-100 bg-slate-500/10 border-slate-400/20',
          gradient: 'from-slate-500/10 via-slate-900 to-black',
          accent: 'text-slate-200',
        };
    }
  };

  if (selectedMatchReport) {
    const homeTeam = state.teams[selectedMatchReport.homeTeamId];
    const awayTeam = state.teams[selectedMatchReport.awayTeamId];

    if (homeTeam && awayTeam) {
      const matchStatus = selectedMatchReport.status;

      if (matchStatus === 'PLAYING' || (isWatchingReport && reportSecond < 360)) {
        return (
          <div className="max-w-2xl mx-auto py-8">
            <LiveReport
              match={selectedMatchReport}
              homeTeam={homeTeam}
              awayTeam={awayTeam}
              players={state.players}
              currentSecond={reportSecond}
            />
            <div className="flex gap-4 mt-6">
              <button
                onClick={() => {
                  setSelectedMatchReport(null);
                  setIsWatchingReport(false);
                  setReportSecond(0);
                }}
                className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-white/40 uppercase tracking-[0.3em] hover:bg-white/10 transition-colors"
              >
                VOLTAR AO GM PANEL
              </button>
            </div>
          </div>
        );
      } else {
        return (
          <div className="max-w-2xl mx-auto py-8 animate-in zoom-in-95 duration-500">
            <PostGameReport
              match={selectedMatchReport}
              homeTeam={homeTeam}
              awayTeam={awayTeam}
              players={state.players}
              onClose={() => {
                setSelectedMatchReport(null);
                setReportSecond(0);
              }}
            />
            <button
              onClick={() => {
                setSelectedMatchReport(null);
                setReportSecond(0);
              }}
              className="mt-6 w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-white/40 uppercase tracking-[0.3em] hover:bg-white/10 transition-colors"
            >
              FECHAR RELATÓRIO
            </button>
          </div>
        );
      }
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 sm:pb-0">
      <div className="rounded-2xl border border-white/10 bg-black/35 p-2">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { id: 'store' as const, label: 'Loja', icon: ShoppingCart },
            { id: 'inventory' as const, label: 'Inventario', icon: Briefcase },
            { id: 'circuit' as const, label: 'Circuito', icon: Crown },
            { id: 'profile' as const, label: 'Perfil', icon: Trophy },
            { id: 'settings' as const, label: 'Config', icon: Sliders },
          ].map(section => (
            <button
              key={section.id}
              type="button"
              onClick={() => setCareerSection(section.id)}
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-[9px] font-black uppercase tracking-[0.22em] transition ${
                careerSection === section.id
                  ? 'border border-cyan-400/35 bg-cyan-500/12 text-cyan-100'
                  : 'border border-white/5 bg-white/[0.03] text-white/45 hover:bg-white/[0.06] hover:text-white/80'
              }`}
            >
              <section.icon size={14} />
              {section.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Left Column - Team Context */}
        <div className="lg:col-span-8 space-y-4 sm:space-y-6">
          {/* User Team Card */}
          <div className="glass-card-neon white-gradient-sheen border-cyan-500/30 p-3 sm:p-5 rounded-2xl sm:rounded-[2rem] shadow-[0_0_30px_rgba(34,211,238,0.1)] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-cyan-500/10 transition-colors duration-700" />

            <div className="flex items-center gap-4 sm:gap-6 relative z-10">
              <div className="relative">
                <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full animate-pulse" />
                <div className="w-14 h-14 sm:w-20 sm:h-20 glass-card rounded-xl sm:rounded-2xl flex items-center justify-center border border-cyan-500/30">
                  {userTeam ? (
                    <TeamLogo
                      primaryColor={userTeam.logo?.primary || '#fff'}
                      secondaryColor={userTeam.logo?.secondary || '#000'}
                      patternId={userTeam.logo?.patternId as any}
                      symbolId={userTeam.logo?.symbolId}
                      size={window.innerWidth < 640 ? 36 : 56}
                    />
                  ) : (
                    <Users size={window.innerWidth < 640 ? 24 : 36} className="text-cyan-400/50" />
                  )}
                </div>
              </div>

              <div className="text-left flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                  <h2 className="text-xl sm:text-2xl font-black text-white uppercase italic tracking-tight neon-text-cyan truncate">
                    {userTeam?.name || 'SEM CLUBE'}
                  </h2>
                  <div className="bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                    <Trophy size={8} className="text-cyan-400" />
                    <span className="text-[7px] sm:text-[9px] font-black text-cyan-400 uppercase tracking-widest">
                      {userTeam?.district || 'DISTRITO'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-1 sm:mt-2">
                  <div className="flex items-center gap-1">
                    <Star size={8} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-[10px] sm:text-sm font-mono font-black text-white">4.8</span>
                    <span className="text-[7px] text-cyan-400/50 uppercase tracking-widest ml-1">Reputação</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tactics & Training Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="glass-card-neon border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.1)] p-3 sm:p-5 rounded-2xl transition-all duration-500">
              <div className="flex items-center gap-2 mb-3 sm:mb-4">
                <div className="w-8 h-8 rounded-lg glass-card flex items-center justify-center text-purple-400 border border-purple-500/30">
                  <Target size={14} />
                </div>
                <h3 className="text-[9px] sm:text-[11px] font-black text-white uppercase tracking-widest">Resumo Tático</h3>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[7px] text-white/30 font-bold uppercase tracking-widest">Estilo</span>
                  <span className="text-[9px] sm:text-[10px] font-black text-purple-400 uppercase italic truncate">{userTeam?.tactics.playStyle}</span>
                </div>
                <div className="flex flex-col gap-1 border-x border-white/5 px-2">
                  <span className="text-[7px] text-white/30 font-bold uppercase tracking-widest">Mente</span>
                  <span className="text-[9px] sm:text-[10px] font-black text-fuchsia-400 uppercase italic truncate">{userTeam?.tactics.mentality}</span>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <span className="text-[7px] text-white/30 font-bold uppercase tracking-widest text-right">Ataque</span>
                  <span className="text-[9px] sm:text-[10px] font-black text-white uppercase italic truncate">
                    {userTeam?.tactics.linePosition <= 30 ? 'Recuada' : userTeam?.tactics.linePosition >= 70 ? 'Alta' : 'Média'}
                  </span>
                </div>
              </div>
            </div>

            <div className="glass-card-neon border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)] p-3 sm:p-5 rounded-2xl transition-all duration-500">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg glass-card flex items-center justify-center text-emerald-400 border border-emerald-500/30">
                    <Flame size={14} />
                  </div>
                  <h3 className="text-[9px] sm:text-[11px] font-black text-white uppercase tracking-widest">Card Lab</h3>
                </div>
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/10 rounded-full">
                  <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[6px] sm:text-[8px] font-black text-emerald-400 uppercase tracking-widest">Ativo</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[8px] sm:text-[10px] text-white/40 uppercase font-black">Próxima Evolução:</span>
                <span className="text-xs sm:text-sm font-mono font-black text-emerald-400">02 DIAS</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Side Panels */}
        <div className="lg:col-span-4 space-y-4 sm:space-y-6">
          {/* Calendar Mini View */}
          <div className="glass-card-neon white-gradient-sheen border-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.1)] p-3 sm:p-5 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg glass-card flex items-center justify-center text-cyan-400 border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                  <Calendar size={14} />
                </div>
                <h3 className="text-[9px] sm:text-[11px] font-black text-white uppercase tracking-widest">Calendário</h3>
              </div>
            </div>

            <div className="space-y-2">
              {upcomingMatches.length > 0 ? (
                upcomingMatches.slice(0, 2).map((match, idx) => {
                  const opponent = state.teams[match.homeTeamId === userTeam?.id ? match.awayTeamId : match.homeTeamId];
                  return (
                    <div key={match.id} className="flex items-center justify-between bg-white/5 p-2 rounded-xl border border-white/5 group hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 glass-card rounded-lg flex items-center justify-center border border-white/10">
                          {opponent ? (
                            <TeamLogo
                              primaryColor={opponent.logo?.primary || '#fff'}
                              secondaryColor={opponent.logo?.secondary || '#000'}
                              patternId={opponent.logo?.patternId as any}
                              symbolId={opponent.logo?.symbolId}
                              size={16}
                            />
                          ) : <Users size={12} className="text-white/20" />}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] sm:text-[11px] font-black text-white uppercase truncate max-w-[100px]">
                            {opponent?.name || 'DESCONHECIDO'}
                          </span>
                          <span className="text-[7px] sm:text-[8px] text-cyan-400/50 font-black uppercase tracking-widest">
                            {isBeforeKickoff ? '--/--' : new Date(match.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                          </span>
                        </div>
                      </div>
                      <span className="text-[8px] sm:text-[10px] font-black text-white/20 uppercase italic">
                        {match.homeTeamId === userTeam?.id ? 'CASA' : 'FORA'}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center border border-dashed border-white/5 rounded-xl">
                  <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Sem jogos</span>
                </div>
              )}
            </div>
          </div>

          {/* Trade Inbox */}
          {state.tradeOffers && state.tradeOffers.filter(t => t.toTeamId === userTeam?.id && t.status === 'PENDING').length > 0 && (
            <div className="glass-card-neon white-gradient-sheen border border-purple-500/30 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-[0_0_30px_rgba(168,85,247,0.15)] flex flex-col gap-3">
              <h3 className="text-[9px] sm:text-[11px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-2">
                <Search size={14} className="text-purple-400" />
                Propostas de Troca
              </h3>
              <div className="flex flex-col gap-2">
                {state.tradeOffers.filter(t => t.toTeamId === userTeam?.id && t.status === 'PENDING').map(offer => {
                  const offeredPlayer = state.players[offer.offeredPlayerId];
                  const requestedPlayer = state.players[offer.requestedPlayerId];
                  const fromTeam = state.teams[offer.fromTeamId];

                  if (!offeredPlayer || !requestedPlayer || !fromTeam) return null;

                  return (
                    <div key={offer.id} className="bg-black/40 border border-white/5 p-3 rounded-xl flex flex-col gap-2">
                      <div className="flex items-center justify-between text-[10px] uppercase font-bold text-white/70">
                        <span>{fromTeam.name} oferece:</span>
                        <span className="text-purple-400">{offer.date}</span>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex-1 bg-white/5 border border-white/10 p-2 rounded-lg flex flex-col items-center justify-center">
                          <span className="text-[10px] text-cyan-400 font-bold mb-1">Eles dão</span>
                          <span className="text-sm font-black text-white">{offeredPlayer.nickname}</span>
                          <span className="text-xs text-white/50">{offeredPlayer.totalRating} pts</span>
                        </div>
                        <Activity size={16} className="text-white/30" />
                        <div className="flex-1 bg-white/5 border border-white/10 p-2 rounded-lg flex flex-col items-center justify-center">
                          <span className="text-[10px] text-orange-400 font-bold mb-1">Eles pedem</span>
                          <span className="text-sm font-black text-white">{requestedPlayer.nickname}</span>
                          <span className="text-xs text-white/50">{requestedPlayer.totalRating} pts</span>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => {
                            // Accept Trade
                            setState(prev => {
                              const s = { ...prev };
                              const myTeam = s.teams[userTeam!.id];
                              const otherTeam = s.teams[fromTeam.id];

                              // Trade arrays
                              myTeam.squad = myTeam.squad.filter(id => id !== requestedPlayer.id);
                              myTeam.squad.push(offeredPlayer.id);
                              otherTeam.squad = otherTeam.squad.filter(id => id !== offeredPlayer.id);
                              otherTeam.squad.push(requestedPlayer.id);

                              // Lineups
                              Object.keys(myTeam.lineup).forEach(pos => { if (myTeam.lineup[pos as any] === requestedPlayer.id) delete myTeam.lineup[pos as any]; });
                              Object.keys(otherTeam.lineup).forEach(pos => { if (otherTeam.lineup[pos as any] === offeredPlayer.id) delete otherTeam.lineup[pos as any]; });

                              // Players
                              s.players[requestedPlayer.id].contract.teamId = otherTeam.id;
                              s.players[offeredPlayer.id].contract.teamId = myTeam.id;

                              s.tradeOffers = s.tradeOffers.map(t => t.id === offer.id ? { ...t, status: 'ACCEPTED' as const } : t);
                              return s;
                            });
                          }}
                          className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 rounded-lg text-[10px] text-white uppercase font-black tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
                        >
                          Aceitar
                        </button>
                        <button
                          onClick={() => {
                            // Decline Trade
                            setState(prev => ({
                              ...prev,
                              tradeOffers: prev.tradeOffers.map(t => t.id === offer.id ? { ...t, status: 'DECLINED' as const } : t)
                            }));
                          }}
                          className="flex-1 py-2 bg-red-950/40 text-red-400 hover:bg-red-900 border border-red-500/30 rounded-lg text-[10px] uppercase font-black tracking-widest transition-all"
                        >
                          Recusar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="glass-card-neon border-amber-500/20 shadow-[0_0_20px_rgba(251,191,36,0.08)] p-3 sm:p-5 rounded-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg glass-card flex items-center justify-center text-amber-300 border border-amber-500/30">
                    {careerSection === 'store'
                      ? <ShoppingCart size={14} />
                      : careerSection === 'inventory'
                        ? <Briefcase size={14} />
                        : careerSection === 'circuit'
                          ? <Crown size={14} />
                          : careerSection === 'settings'
                            ? <Sliders size={14} />
                            : <Trophy size={14} />}
                  </div>
                  <h3 className="text-[9px] sm:text-[11px] font-black text-white uppercase tracking-widest">
                    {careerSection === 'store'
                      ? 'Loja'
                      : careerSection === 'inventory'
                        ? 'Inventario'
                        : careerSection === 'circuit'
                          ? 'Circuito'
                          : careerSection === 'settings'
                            ? 'Config'
                            : 'Perfil'}
                  </h3>
                </div>
                <p className="mt-2 text-[8px] font-bold uppercase tracking-widest text-white/35">
                  {careerSection === 'store'
                    ? 'Compre estilo para clube e jogadores sem tocar no balanceamento.'
                    : careerSection === 'inventory'
                      ? 'Veja tudo que ja foi comprado e o que esta pronto para equipar.'
                      : careerSection === 'circuit'
                        ? 'Campanha global do app que corre por fora das temporadas dos mundos.'
                        : careerSection === 'settings'
                          ? 'Preferencias simples e suporte ficam aqui, fora do fluxo principal.'
                          : 'Honra, colecao e identidade do manager atravessando mundos.'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[7px] font-black uppercase tracking-[0.25em] text-amber-200">Ouro</p>
                <p className="text-lg font-black italic text-white">{viewGoldBalance}</p>
                <p className="text-[7px] font-black uppercase tracking-[0.25em] text-cyan-200">{viewFragmentBalance} frag</p>
                {careerSection === 'store' && (
                  <button
                    type="button"
                    onClick={() => setSelectedGoldPack(GOLD_PACKS[1] || GOLD_PACKS[0] || null)}
                    className="mt-2 inline-flex items-center gap-1 rounded-full border border-amber-300/30 bg-amber-400/10 px-2.5 py-1 text-[7px] font-black uppercase tracking-widest text-amber-100 transition hover:bg-amber-400/15"
                  >
                    <Coins size={10} />
                    Comprar
                  </button>
                )}
              </div>
            </div>

            {careerSection === 'store' && (
              <>
                <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-[0.25em] text-amber-200">Ouro da loja</p>
                      <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-white">
                        Dinheiro real compra ouro. Ouro compra skins, logos e chuteiras. Poder bruto nao entra na loja.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedGoldPack(GOLD_PACKS[1] || GOLD_PACKS[0] || null)}
                      className="shrink-0 rounded-xl border border-amber-300/30 bg-amber-300/15 px-3 py-2 text-[8px] font-black uppercase tracking-widest text-amber-100 transition hover:bg-amber-300/20"
                    >
                      Pacotes
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/10 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-[0.25em] text-cyan-200">{APP_CIRCUIT.name}</p>
                      <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-white">
                        Complete 3 temporadas em 90 dias para fechar a skin de veterano.
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-black italic text-white">{viewCircuit.seasonRunsCompleted}/{viewCircuit.targetSeasonRuns}</p>
                      <p className="text-[7px] font-black uppercase tracking-widest text-white/35">
                        {viewCircuit.premiumActive ? 'Passe ativo' : 'Passe desligado'}
                      </p>
                    </div>
                  </div>
                </div>

                {[
                  { title: 'Chuteiras', items: shopBoots, usage: 'Jogador' },
                  { title: 'Uniformes', items: shopKits, usage: 'Clube' },
                  { title: 'Logos', items: shopLogos, usage: 'Clube' },
                  { title: 'Manager', items: shopProfileItems, usage: 'Manager' },
                ].map(section => (
                  <div key={section.title} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[8px] font-black uppercase tracking-[0.25em] text-white/40">{section.title}</p>
                      <p className="text-[7px] font-black uppercase tracking-widest text-white/20">{section.items.length} itens</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-5">
                      {section.items.map(item => {
                        const owned = isOwnedInView(item.id);
                        const canEquip = owned && (
                          item.category === 'ACCESSORY' ||
                          item.category === 'BADGE' ||
                          ((item.category === 'KIT' || item.category === 'LOGO') && !!userTeam)
                        );
                        const isEquipped = equippedManagerItemIds.has(item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            className={`group flex aspect-square min-w-0 flex-col items-center justify-center rounded-xl border p-1.5 text-center transition hover:bg-white/[0.06] ${
                              owned
                                ? 'border-cyan-400/25 bg-cyan-500/10'
                                : 'border-white/10 bg-black/35'
                            }`}
                            onClick={() => setSelectedStoreItem(item)}
                          >
                            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-black/45 sm:h-14 sm:w-14">
                              <img src={item.imagePath} alt={item.name} className="h-full w-full object-contain p-1" />
                            </div>
                            <p className="mt-1 w-full truncate text-[7px] font-black uppercase tracking-wide text-white">{item.name}</p>
                            <p className="text-[6px] font-black uppercase tracking-widest text-white/35">
                              {item.price} {item.currency === 'GOLD' ? 'ouro' : 'frag'}
                            </p>
                            <div className="mt-0.5 flex min-h-[0.9rem] items-center justify-center">
                              <span className={`rounded-full border px-1.5 py-0.5 text-[6px] font-black uppercase tracking-widest ${
                                isEquipped
                                  ? 'border-amber-300/35 bg-amber-400/15 text-amber-100'
                                  : owned
                                  ? 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100'
                                  : 'border-white/10 bg-white/[0.03] text-white/35'
                              }`}>
                                {isEquipped ? 'Exibido' : owned ? 'Seu' : item.rarity}
                              </span>
                            </div>
                            {canEquip && (
                              <span className="mt-0.5 block text-[6px] font-black uppercase tracking-widest text-cyan-200">
                                {section.usage}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </>
            )}

            {careerSection === 'inventory' && (
              <ManagerProfileHub worldsPlayed={worlds.length} />
            )}

            {careerSection === 'circuit' && (
              <div className="space-y-3">
                <div className="relative overflow-hidden rounded-[1.75rem] border border-cyan-400/20 bg-black/45 p-4 shadow-[0_0_35px_rgba(34,211,238,0.12)]">
                  <img
                    src={APP_CIRCUIT.bannerImagePath}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover opacity-30"
                  />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.18),transparent_36%)]" />
                  <div className="absolute -right-10 top-2 h-28 w-28 rounded-full bg-cyan-400/10 blur-3xl" />
                  <div className="absolute -left-10 bottom-0 h-28 w-28 rounded-full bg-fuchsia-500/10 blur-3xl" />

                  <div className="relative z-10 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-[7px] font-black uppercase tracking-[0.3em] text-cyan-100">
                          <Crown size={12} />
                          Passe do Circuito
                        </div>
                        <h3 className="mt-3 text-2xl font-black uppercase italic tracking-tight text-white">
                          {APP_CIRCUIT.name}
                        </h3>
                        <p className="mt-2 max-w-[28rem] text-[11px] font-bold leading-relaxed text-white/75">
                          A temporada do mundo continua sendo a do seu clube. O circuito corre por fora por 90 dias e transforma sua jornada em uma campanha premium com trilha, oraculo e trofeu social.
                        </p>
                      </div>
                      <div className="hidden h-24 w-24 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/20 bg-black/45 shadow-inner sm:flex">
                        <img src={APP_CIRCUIT.passIconPath} alt="" className="h-full w-full object-contain p-2" />
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-right shadow-inner">
                        <p className="text-[7px] font-black uppercase tracking-[0.25em] text-cyan-200">Progresso</p>
                        <p className="mt-1 text-3xl font-black italic text-white">{viewCircuit.seasonRunsCompleted}/{viewCircuit.targetSeasonRuns}</p>
                        <p className="text-[7px] font-black uppercase tracking-[0.22em] text-white/35">temporadas</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-md">
                        <p className="text-[7px] font-black uppercase tracking-widest text-white/35">Duracao</p>
                        <p className="mt-1 text-lg font-black italic text-white">90 dias</p>
                        <p className="text-[7px] font-black uppercase tracking-widest text-white/25">app inteiro</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-md">
                        <p className="text-[7px] font-black uppercase tracking-widest text-white/35">Passe</p>
                        <p className="mt-1 text-sm font-black uppercase italic text-white">{viewCircuit.premiumActive ? 'ativo' : 'inativo'}</p>
                        <p className="text-[7px] font-black uppercase tracking-widest text-white/25">premium</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur-md">
                        <p className="text-[7px] font-black uppercase tracking-widest text-white/35">Recompensa final</p>
                        <div className="mt-1 flex items-center gap-2">
                          <img src={APP_CIRCUIT.finalRewardImagePath} alt="" className="h-8 w-8 object-contain" />
                          <p className="text-sm font-black uppercase italic text-white">Elite Original</p>
                        </div>
                        <p className="text-[7px] font-black uppercase tracking-widest text-white/25">badge social</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedGoldPack(getBillingProduct('passe_circuito_neon_01'))}
                        disabled={viewCircuit.premiumActive}
                        className="rounded-2xl border border-cyan-400/30 bg-cyan-500/12 px-4 py-3 text-[9px] font-black uppercase tracking-[0.28em] text-cyan-100 shadow-[0_0_16px_rgba(34,211,238,0.15)] transition hover:bg-cyan-500/18"
                      >
                        {viewCircuit.premiumActive ? 'Passe ativo' : 'Ativar premium'}
                      </button>
                      <button
                        type="button"
                        className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[9px] font-black uppercase tracking-[0.28em] text-white/70 transition hover:bg-white/[0.07]"
                      >
                        Ver trilha
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[1.5rem] border border-cyan-400/15 bg-black/35 p-4 shadow-[0_0_18px_rgba(34,211,238,0.08)]">
                    <div className="flex items-center justify-between">
                      <p className="text-[8px] font-black uppercase tracking-[0.25em] text-cyan-200">Trilha gratis</p>
                      <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-1 text-[7px] font-black uppercase tracking-[0.22em] text-white/45">base</span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {[
                        'Ouro por marcos do circuito',
                        'Cosmeticos comuns',
                        'Progresso visivel para todos',
                      ].map(line => (
                        <div key={line} className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-[8px] font-black uppercase tracking-widest text-white/55">
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-fuchsia-400/15 bg-black/35 p-4 shadow-[0_0_18px_rgba(168,85,247,0.08)]">
                    <div className="flex items-center justify-between">
                      <p className="text-[8px] font-black uppercase tracking-[0.25em] text-fuchsia-200">Trilha premium</p>
                      <span className="rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-2 py-1 text-[7px] font-black uppercase tracking-[0.22em] text-fuchsia-100">Passe</span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {[
                        'Oraculo tatico',
                        'Fragmentos extras no fechamento',
                        'Badge final de veterano',
                      ].map(line => (
                        <div key={line} className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2 text-[8px] font-black uppercase tracking-widest text-white/55">
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-emerald-400/15 bg-black/35 p-4 shadow-[0_0_18px_rgba(16,185,129,0.08)]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-[0.25em] text-emerald-200">Recompensas por temporada</p>
                      <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-white/40">
                        A loja anda com o jogo: cada fechamento de temporada alimenta ouro e fragmentos.
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-right">
                      <p className="text-[7px] font-black uppercase tracking-widest text-white/35">Ciclo normal</p>
                      <p className="mt-1 text-lg font-black italic text-white">60+ ouro</p>
                    </div>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/25">
                    <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-white/5 bg-white/[0.04] px-4 py-3 text-[8px] font-black uppercase tracking-[0.24em] text-white/35">
                      <span>Marco</span>
                      <span>Ouro</span>
                      <span>Frag</span>
                    </div>
                    <div className="divide-y divide-white/[0.04]">
                      {seasonRewardRows.map(row => (
                        <div key={row.label} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-4 py-3">
                          <span className="text-[8px] font-black uppercase tracking-widest text-white/60">{row.label}</span>
                          <span className="text-[9px] font-black uppercase tracking-widest text-amber-200">{row.gold > 0 ? `+${row.gold}` : '--'}</span>
                          <span className="text-[9px] font-black uppercase tracking-widest text-cyan-200">{row.fragments > 0 ? `+${row.fragments}` : '--'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {careerSection === 'profile' && (
              <div className="space-y-3">
                <div className="rounded-[1.75rem] border border-amber-400/20 bg-black/45 p-4 shadow-[0_0_28px_rgba(251,191,36,0.1)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-[0.25em] text-amber-200">Perfil global</p>
                      <h3 className="mt-2 text-2xl font-black uppercase italic tracking-tight text-white">
                        {userManager?.name || 'Manager Elite'}
                      </h3>
                      <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-white/45">
                        {profileTier} - honra {profileHonorScore}
                      </p>
                      <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-white/35">
                        Trofeus aparecem pelo curriculo. Inventario dos outros fica privado.
                      </p>
                    </div>
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-300/10 text-amber-100">
                      <Crown size={24} />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                      <p className="text-[7px] font-black uppercase tracking-widest text-white/35">Titulos</p>
                      <p className="mt-1 text-xl font-black italic text-white">{userManager?.career.titlesWon || 0}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                      <p className="text-[7px] font-black uppercase tracking-widest text-white/35">Hall</p>
                      <p className="mt-1 text-xl font-black italic text-white">{userManager?.career.hallOfFameEntries || 0}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                      <p className="text-[7px] font-black uppercase tracking-widest text-white/35">Colecao</p>
                      <p className="mt-1 text-xl font-black italic text-white">{ownedItems.length}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-[0.25em] text-amber-100">Exibicao do perfil</p>
                      <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-white/45">
                        Ate 3 itens em destaque. Trofeus ficam no curriculo e nao ocupam slot.
                      </p>
                    </div>
                    <p className="shrink-0 text-lg font-black italic text-white">{equippedManagerItems.length}/3</p>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {[
                      equippedManagerItems[0],
                      equippedManagerItems[1],
                      equippedManagerItems[2],
                    ].map((item, index) => (
                      <button
                        key={item?.id || `empty-manager-slot-${index}`}
                        type="button"
                        onClick={() => item && setSelectedStoreItem(item)}
                        disabled={!item}
                        className="aspect-square rounded-xl border border-white/10 bg-black/35 p-2 text-left transition hover:bg-white/[0.05] disabled:cursor-default disabled:opacity-45"
                      >
                        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-black/45 text-white/70">
                          {item ? <img src={item.imagePath} alt={item.name} className="h-full w-full object-contain p-1" /> : <Shield size={16} />}
                        </div>
                        <p className="mt-2 truncate text-[7px] font-black uppercase tracking-wide text-white">
                          {item?.name || 'Slot vazio'}
                        </p>
                        <p className="text-[6px] font-black uppercase tracking-widest text-white/35">
                          {item ? 'em exibicao' : 'item'}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-violet-400/20 bg-violet-500/10 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-[0.25em] text-violet-100">Traits do manager</p>
                      <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-white/45">
                        Traits sao conquistados no perfil. Voce equipa os que quer usar neste mundo.
                      </p>
                    </div>
                    <p className="shrink-0 text-lg font-black italic text-white">{equippedManagerTraitIds.length}/2</p>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {ownedManagerTraits.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-white/10 p-3 text-center sm:col-span-2">
                        <p className="text-[8px] font-black uppercase tracking-widest text-white/30">Nenhum trait liberado ainda.</p>
                      </div>
                    ) : ownedManagerTraits.map(trait => {
                      const isEquipped = equippedManagerTraitIds.includes(trait.id);
                      return (
                        <button
                          key={trait.id}
                          type="button"
                          onClick={() => handleToggleManagerTrait(trait.id)}
                          className={`rounded-xl border p-3 text-left transition ${
                            isEquipped
                              ? 'border-violet-300/40 bg-violet-300/15'
                              : 'border-white/10 bg-black/35 hover:bg-white/[0.05]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-[8px] font-black uppercase tracking-widest text-white">{trait.name}</p>
                            <span className={`rounded-full border px-2 py-0.5 text-[6px] font-black uppercase tracking-widest ${
                              isEquipped
                                ? 'border-violet-300/30 bg-violet-400/15 text-violet-100'
                                : 'border-white/10 bg-white/[0.03] text-white/35'
                            }`}>
                              {isEquipped ? 'equipado' : 'guardar'}
                            </span>
                          </div>
                          <p className="mt-2 text-[8px] font-bold uppercase tracking-wider text-white/40">{trait.description}</p>
                          <p className="mt-2 text-[7px] font-black uppercase tracking-widest text-violet-100/60">
                            influencia +{trait.influence}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-[0.25em] text-cyan-100">Acessorios de manager</p>
                      <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-white/45">
                        Itens do perfil atravessam mundos. Bonus aqui e leve, de identidade e leitura, nao de placar.
                      </p>
                    </div>
                    <p className="shrink-0 text-lg font-black italic text-white">{ownedProfileItems.length}/{shopProfileItems.length}</p>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {shopProfileItems.map(item => {
                      const owned = isOwnedInView(item.id);
                      const isEquipped = equippedManagerItemIds.has(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedStoreItem(item)}
                          className={`aspect-square rounded-xl border p-2 text-left transition ${
                            isEquipped
                              ? 'border-amber-300/35 bg-amber-400/12'
                              : owned
                                ? 'border-cyan-300/35 bg-cyan-300/12'
                              : 'border-white/10 bg-black/35 hover:bg-white/[0.05]'
                          }`}
                        >
                          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-black/45 text-white/70">
                            <img src={item.imagePath} alt={item.name} className="h-full w-full object-contain p-1" />
                          </div>
                          <p className="mt-2 truncate text-[7px] font-black uppercase tracking-wide text-white">{item.name}</p>
                          <p className="text-[6px] font-black uppercase tracking-widest text-white/35">{isEquipped ? 'em exibicao' : owned ? 'seu' : item.rarity}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-black/35 p-3">
                  <p className="text-[8px] font-black uppercase tracking-[0.25em] text-white/35">Clube deste mundo</p>
                  <div className="mt-3 space-y-2">
                    <div className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-[8px] font-black uppercase tracking-widest text-white/55">
                      Liga: {userTeam?.titles?.league || 0}
                    </div>
                    <div className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-[8px] font-black uppercase tracking-widest text-white/55">
                      Copa: {userTeam?.titles?.cup || 0}
                    </div>
                    <div className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-[8px] font-black uppercase tracking-widest text-white/55">
                      Total: {userTeam?.titles?.total || 0}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {careerSection === 'settings' && (
              <div className="space-y-3">
                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-[0.25em] text-cyan-200">Preferencias</p>
                      <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-white/40">
                        Ajustes simples para deixar o app menos barulhento.
                      </p>
                    </div>
                    <Sliders size={18} className="text-cyan-200" />
                  </div>

                  <div className="mt-4 grid gap-2">
                    <button
                      type="button"
                      onClick={() => updateSoundEnabled(!soundEnabled)}
                      className={`flex items-center justify-between rounded-xl border px-3 py-3 text-left transition active:scale-[0.98] ${
                        soundEnabled
                          ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100'
                          : 'border-white/10 bg-white/[0.04] text-white/55'
                      }`}
                    >
                      <span className="text-[9px] font-black uppercase tracking-[0.22em]">Sons</span>
                      <span className="text-[8px] font-black uppercase tracking-[0.22em]">{soundEnabled ? 'Ligados' : 'Desligados'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateHapticsEnabled(!hapticsEnabled)}
                      className={`flex items-center justify-between rounded-xl border px-3 py-3 text-left transition active:scale-[0.98] ${
                        hapticsEnabled
                          ? 'border-amber-400/25 bg-amber-500/10 text-amber-100'
                          : 'border-white/10 bg-white/[0.04] text-white/55'
                      }`}
                    >
                      <span className="text-[9px] font-black uppercase tracking-[0.22em]">Vibracao</span>
                      <span className="text-[8px] font-black uppercase tracking-[0.22em]">{hapticsEnabled ? 'Ligada' : 'Desligada'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateInitialHelpEnabled(!initialHelpEnabled)}
                      className={`flex items-center justify-between rounded-xl border px-3 py-3 text-left transition active:scale-[0.98] ${
                        initialHelpEnabled
                          ? 'border-cyan-400/25 bg-cyan-500/10 text-cyan-100'
                          : 'border-white/10 bg-white/[0.04] text-white/55'
                      }`}
                    >
                      <span className="text-[9px] font-black uppercase tracking-[0.22em]">Ajuda inicial</span>
                      <span className="text-[8px] font-black uppercase tracking-[0.22em]">{initialHelpEnabled ? 'Ativa' : 'Oculta'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateMatchNotificationsEnabled(!matchNotificationsEnabled)}
                      className={`flex items-center justify-between rounded-xl border px-3 py-3 text-left transition active:scale-[0.98] ${
                        matchNotificationsEnabled
                          ? 'border-fuchsia-400/25 bg-fuchsia-500/10 text-fuchsia-100'
                          : 'border-white/10 bg-white/[0.04] text-white/55'
                      }`}
                    >
                      <span className="text-[9px] font-black uppercase tracking-[0.22em]">Alertas de jogo</span>
                      <span className="text-[8px] font-black uppercase tracking-[0.22em]">{matchNotificationsEnabled ? 'Ligados' : 'Desligados'}</span>
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-[0.25em] text-amber-200">Suporte</p>
                      <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-white/40">
                        Reporte bug ou comportamento estranho sem poluir o cabeçalho.
                      </p>
                    </div>
                    <MessageSquare size={18} className="text-amber-200" />
                  </div>
                  <button
                    type="button"
                    onClick={props.onOpenFeedback}
                    className="mt-4 w-full rounded-xl border border-amber-400/30 bg-black/35 px-3 py-3 text-[9px] font-black uppercase tracking-[0.25em] text-amber-100 transition hover:bg-amber-400 hover:text-black"
                  >
                    Reportar problema
                  </button>
                </div>

                <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[8px] font-black uppercase tracking-[0.25em] text-rose-200">Conta</p>
                      <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-white/40">
                        Remove o cadastro e os dados online vinculados ao login atual.
                      </p>
                    </div>
                    <Trash2 size={18} className="text-rose-200" />
                  </div>
                  <button
                    type="button"
                    onClick={handleDeleteAccount}
                    disabled={isDeletingAccount || !isAuthenticated}
                    className="mt-4 w-full rounded-xl border border-rose-400/30 bg-black/35 px-3 py-3 text-[9px] font-black uppercase tracking-[0.25em] text-rose-100 transition hover:bg-rose-400 hover:text-black disabled:cursor-not-allowed disabled:border-white/10 disabled:text-white/25 disabled:hover:bg-black/35"
                  >
                    {isDeletingAccount ? 'Excluindo...' : 'Excluir conta'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {canUseDevTools && (
            <>
          {/* GM Panel */}
          <div className="glass-card-neon white-gradient-sheen border border-red-500/30 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-[0_0_30px_rgba(239,68,68,0.15)] flex flex-col gap-2 sm:gap-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl -mr-12 -mt-12" />
            <h3 className="text-[9px] sm:text-[11px] font-black text-red-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-1 relative z-10">
              <Database size={window.innerWidth < 640 ? 12 : 16} className="drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]" />
              GM Panel <span className="text-[7px] opacity-50 font-normal ml-1">(DEV)</span>
            </h3>

            {state.isCreator && (
              <div className="relative z-10 rounded-xl border border-cyan-500/25 bg-cyan-500/10 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[8px] font-black uppercase tracking-[0.25em] text-cyan-200">Codigo do mundo</p>
                    <p className="mt-1 font-mono text-lg font-black tracking-[0.18em] text-white">{worldJoinCode}</p>
                    <p className="mt-1 text-[7px] font-bold uppercase tracking-widest text-cyan-100/45">
                      Envie para alguem entrar como observador quando a entrada por codigo estiver ativa.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyJoinCode}
                    className="shrink-0 rounded-xl border border-cyan-400/30 bg-black/35 p-3 text-cyan-200 transition hover:bg-cyan-400 hover:text-black"
                    title="Copiar codigo"
                  >
                    <Copy size={16} />
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 sm:gap-4 relative z-10">
              <button
                onClick={handleOpenRandomPlayer}
                className="flex items-center gap-2 sm:gap-3 bg-black/40 border border-white/5 hover:border-red-500/50 p-2 sm:p-3 rounded-lg sm:rounded-xl transition-all group"
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 group-hover:bg-red-500/20 transition-colors">
                  <User size={window.innerWidth < 640 ? 16 : 20} />
                </div>
                <div className="flex flex-col items-start text-left">
                  <span className="text-[9px] sm:text-[11px] font-black text-white uppercase tracking-tighter">Skins</span>
                  <span className="text-[7px] sm:text-[9px] text-slate-500 uppercase font-bold">Mini Card</span>
                </div>
              </button>

              <button
                onClick={() => handleSimulateGameReport('live')}
                className="flex items-center gap-2 sm:gap-3 bg-black/40 border border-white/5 hover:border-red-500/50 p-2 sm:p-3 rounded-lg sm:rounded-xl transition-all group"
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400 group-hover:bg-red-500/20 transition-colors">
                  <Activity size={window.innerWidth < 640 ? 16 : 20} />
                </div>
                <div className="flex flex-col items-start text-left">
                  <span className="text-[9px] sm:text-[11px] font-black text-white uppercase tracking-tighter">Mock</span>
                  <span className="text-[7px] sm:text-[9px] text-slate-500 uppercase font-bold">Relatório</span>
                </div>
              </button>
            </div>
          </div>

          <HairCalibrationPanel />
            </>
          )}
        </div>
      </div>

      {canUseDevTools && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* World Clock Control */}
        <div className="p-3 sm:p-6 bg-white/5 border border-white/10 rounded-2xl sm:rounded-[2rem] space-y-3 sm:space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl border transition-all ${isPaused ? 'bg-amber-500/10 border-amber-500/30' : 'bg-cyan-500/10 border-cyan-500/30'}`}>
                <Clock size={window.innerWidth < 640 ? 16 : 20} className={isPaused ? 'text-amber-500' : 'text-cyan-400 animate-pulse'} />
              </div>
              <div>
                <h4 className="text-[10px] sm:text-xs font-black text-white uppercase tracking-widest">Relógio Global</h4>
                <p className="text-[8px] sm:text-[10px] text-slate-500 font-bold uppercase">{isPaused ? 'Pausado' : 'Ativo'}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg sm:text-xl font-black text-white tabular-nums tracking-tighter italic flex flex-col items-end">
                <span>{worldClockDisplayDate.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', '')}</span>
                <span className="text-xs opacity-40">{worldClockDisplayDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="text-[8px] sm:text-[9px] font-black text-cyan-400 uppercase tracking-widest mt-1">
                Dia da Season: {worldSeasonDay}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <button
              onClick={togglePause}
              className={`py-3 sm:py-4 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${isPaused ? 'bg-cyan-500 text-black hover:bg-white' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
            >
              {isPaused ? <Play size={12} fill="currentColor" /> : <Clock size={12} />}
              {isPaused ? 'RETOMAR' : 'PAUSAR'}
            </button>
            <div className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 text-center">
              <div>
                <div className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">Ritmo Oficial</div>
                <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-white">
                  {state.world.clock?.label || 'Tempo real'}
                </div>
              </div>
            </div>
          </div>

          {(() => {
            if (state.world.phase === 'OFFSEASON') {
              return (
                <button
                  onClick={handleStartNewSeason}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-emerald-500 border border-emerald-400 p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all group hover:scale-[1.02] shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-pulse"
                >
                  <Award size={16} className="text-black" />
                  <span className="text-[10px] sm:text-xs font-black text-black uppercase tracking-widest">Pular Offseason</span>
                </button>
              );
            }

            return null;
          })()}
        </div>

        {/* Mini Card Display Area */}
        <div className="bg-black/60 rounded-2xl border border-white/10 flex items-center justify-center p-6 relative min-h-[300px] shadow-inner overflow-hidden">
          {/* Background Glow */}
          <div className="absolute inset-0 bg-gradient-to-t from-red-500/5 to-transparent pointer-events-none" />

          {gmRandomPlayer ? (
            <div className="w-[180px] sm:w-[200px] transform hover:scale-105 transition-transform duration-500 relative z-10 group">
              <div className="absolute -inset-4 bg-red-500/20 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <PlayerCard
                player={gmRandomPlayer}
                variant="full"
                onClick={() => setSelectedPlayer(gmRandomPlayer)}
              />
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-red-600 text-[7px] font-black text-white px-3 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(220,38,38,0.5)] z-20 border border-white/20 whitespace-nowrap">
                Skin Preview Mode
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 opacity-20 text-slate-500">
              <User size={32} />
              <span className="text-[8px] uppercase font-bold">Aguardando...</span>
            </div>
          )}
        </div>
      </div>

      )}

      {/* Evolução / Pontos de Poder Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3 px-0">
        <div className="md:col-span-2 glass-card border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-2xl">
          <div className="flex items-center justify-between mb-3 sm:mb-5">
            <h3 className="text-[9px] sm:text-[11px] font-black text-white/60 uppercase tracking-[0.2em] flex items-center gap-2 sm:gap-3">
              <TrendingUp size={window.innerWidth < 640 ? 12 : 16} className="text-cyan-400" />
              Evolução (pts)
            </h3>
            <span className="text-[8px] sm:text-[10px] text-emerald-400 font-black bg-emerald-500/10 px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg border border-emerald-500/20 italic">+12%</span>
          </div>

          <div className="h-24 sm:h-40 flex items-end justify-between gap-1 sm:gap-1.5 px-1 relative border-l border-b border-white/10">
            {/* Grid Lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
              <div className="h-px bg-white/20 w-full border-dashed" />
              <div className="h-px bg-white/20 w-full border-dashed" />
              <div className="h-px bg-white/20 w-full border-dashed" />
            </div>

            {/* Mock Chart Bars */}
            {[30, 45, 40, 55, 60, 50, 65, 75, 70, 85, 90, 80].map((h, i) => (
              <div key={i} className="w-full bg-white/5 rounded-t-[2px] sm:rounded-t-xl relative group z-10 overflow-hidden">
                <div
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-cyan-600 to-cyan-400 group-hover:from-white group-hover:to-white transition-all rounded-t-[2px] sm:rounded-t-xl shadow-[0_0_15px_rgba(34,211,238,0.4)]"
                  style={{ height: `${h}%` }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-1.5 sm:mt-3 px-1">
            <span className="text-[7px] sm:text-[9px] text-white/20 font-black uppercase tracking-widest">R1</span>
            <span className="text-[7px] sm:text-[9px] text-white/20 font-black uppercase tracking-widest">R12</span>
          </div>
        </div>

        {/* Top Player Variations */}
        <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-[0_0_15px_rgba(0,0,0,0.2)] flex flex-col gap-2 sm:gap-4">
          <h3 className="text-[9px] sm:text-[11px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-2 mb-0.5">
            <Zap size={window.innerWidth < 640 ? 12 : 16} className="text-purple-400" />
            Variação Atletas
          </h3>

          <div className="flex flex-col gap-2 sm:gap-3">
            {[
              { pos: 'ATA', name: 'K. Nexus', val: '+45', color: 'cyan', up: true },
              { pos: 'MEI', name: 'J. Storm', val: '+32', color: 'purple', up: true },
              { pos: 'ZAG', name: 'M. Steel', val: '-15', color: 'red', up: false }
            ].map((p, i) => (
              <div key={i} className="flex items-center justify-between bg-white/5 p-2 sm:p-3 rounded-lg sm:rounded-xl border border-white/5 group hover:bg-white/10 transition-colors cursor-pointer">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className={`w-6 h-6 sm:w-8 sm:h-8 bg-${p.color}-500/10 rounded sm:rounded-lg border border-${p.color}-500/20 flex items-center justify-center text-[8px] sm:text-[10px] font-black text-${p.color}-400`}>
                    {p.pos}
                  </div>
                  <div className="flex flex-col">
                    <span className={`text-[9px] sm:text-[12px] font-black text-white group-hover:text-${p.color}-300 transition-colors truncate max-w-[80px] sm:max-w-none`}>
                      {p.name}
                    </span>
                  </div>
                </div>
                <span className={`text-[9px] sm:text-[12px] font-mono font-black ${p.up ? 'text-emerald-400' : 'text-red-400'}`}>
                  {p.val}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedStoreItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={() => setSelectedStoreItem(null)}>
          {(() => {
            const rarityStyle = getStoreRarityStyle(selectedStoreItem.rarity);
            const isManagerItem = selectedStoreItem.category === 'ACCESSORY' || selectedStoreItem.category === 'BADGE';
            const isManagerEquipped = equippedManagerItemIds.has(selectedStoreItem.id);
            return (
          <div
            className={`w-full max-w-sm rounded-[2rem] border ${rarityStyle.border} bg-slate-950/95 shadow-[0_0_40px_rgba(0,0,0,0.55)] ${rarityStyle.glow} overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`relative bg-gradient-to-b ${rarityStyle.gradient} p-5`}>
              <div className="pointer-events-none absolute inset-0 opacity-40">
                <div className="absolute -left-8 top-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
                <div className="absolute -right-10 bottom-0 h-28 w-28 rounded-full bg-white/10 blur-3xl" />
              </div>
              <button
                type="button"
                onClick={() => setSelectedStoreItem(null)}
                className="absolute right-4 top-4 rounded-full border border-white/10 bg-black/40 p-2 text-white/50 transition hover:text-white"
              >
                <X size={14} />
              </button>
              <div className={`mx-auto w-36 h-36 rounded-[1.5rem] border ${rarityStyle.border} bg-black/45 overflow-hidden flex items-center justify-center relative`}>
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-60" />
                <img src={selectedStoreItem.imagePath} alt={selectedStoreItem.name} className="w-full h-full object-contain p-4" />
              </div>
              <div className="mt-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <span className={`rounded-full border px-2.5 py-1 text-[7px] font-black uppercase tracking-[0.28em] ${rarityStyle.badge}`}>
                    {selectedStoreItem.rarity}
                  </span>
                  <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/55">{selectedStoreItem.category}</span>
                </div>
                <h3 className="mt-2 text-xl font-black uppercase italic tracking-tight text-white">{selectedStoreItem.name}</h3>
                {selectedStoreItem.collectionLabel && (
                  <p className="mt-2 text-[8px] font-black uppercase tracking-[0.28em] text-white/55">
                    {selectedStoreItem.collectionLabel}
                  </p>
                )}
                <p className={`mt-2 text-[8px] font-black uppercase tracking-widest ${rarityStyle.accent}`}>
                  {selectedStoreItem.rarity} - {selectedStoreItem.price} {selectedStoreItem.currency === 'GOLD' ? 'ouro' : 'fragmentos'}
                </p>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className={`rounded-xl border ${rarityStyle.border} bg-white/[0.03] p-3`}>
                <p className="text-[8px] font-black uppercase tracking-[0.25em] text-white/35">Descricao</p>
                <p className="mt-2 text-[11px] font-bold leading-relaxed text-white/80">{selectedStoreItem.description}</p>
              </div>

              {selectedStoreItem.effectLabel && (
                <div className={`rounded-xl border ${rarityStyle.border} bg-white/[0.03] p-3`}>
                  <p className="text-[8px] font-black uppercase tracking-[0.25em] text-white/35">Assinatura</p>
                  <p className={`mt-2 text-[10px] font-black uppercase tracking-[0.2em] ${rarityStyle.accent}`}>
                    {selectedStoreItem.effectLabel}
                  </p>
                  {selectedStoreItem.effectDescription && (
                    <p className="mt-2 text-[10px] font-bold leading-relaxed text-white/75">
                      {selectedStoreItem.effectDescription}
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-[7px] font-black uppercase tracking-widest text-white/35">Status</p>
                  <p className="mt-1 text-sm font-black uppercase italic text-white">
                    {isManagerEquipped ? 'Em exibicao' : isOwnedInView(selectedStoreItem.id) ? 'No inventario' : 'Nao comprado'}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-[7px] font-black uppercase tracking-widest text-white/35">Uso</p>
                  <p className="mt-1 text-sm font-black uppercase italic text-white">
                    {selectedStoreItem.category === 'BOOT' ? 'Jogador' : selectedStoreItem.category === 'KIT' || selectedStoreItem.category === 'LOGO' ? 'Clube' : 'Manager'}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedStoreItem(null)}
                  className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[9px] font-black uppercase tracking-[0.25em] text-white/65 transition hover:bg-white/[0.06]"
                >
                  OK
                </button>
                <button
                  type="button"
                  onClick={() => handleStoreItemAction(selectedStoreItem)}
                  className={`flex-1 rounded-xl border px-4 py-3 text-[9px] font-black uppercase tracking-[0.25em] transition ${rarityStyle.badge} hover:bg-white/10`}
                >
                  {!isOwnedInView(selectedStoreItem.id)
                    ? 'Comprar'
                    : isManagerEquipped
                      ? 'Remover'
                    : selectedStoreItem.category === 'KIT' || selectedStoreItem.category === 'LOGO' || isManagerItem
                      ? 'Equipar'
                      : 'Fechar'}
                </button>
              </div>
            </div>
          </div>
            );
          })()}
        </div>
      )}

      {selectedGoldPack && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={() => setSelectedGoldPack(null)}>
          <div
            className="w-full max-w-md overflow-hidden rounded-[2rem] border border-amber-300/25 bg-slate-950/95 shadow-[0_0_40px_rgba(251,191,36,0.16)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative border-b border-white/10 bg-gradient-to-br from-amber-400/16 via-slate-950 to-black p-5">
              <button
                type="button"
                onClick={() => setSelectedGoldPack(null)}
                className="absolute right-4 top-4 rounded-full border border-white/10 bg-black/40 p-2 text-white/50 transition hover:text-white"
              >
                <X size={14} />
              </button>
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-300/30 bg-amber-300/10 text-amber-100">
                {selectedGoldPack.imagePath ? (
                  <img src={selectedGoldPack.imagePath} alt="" className="h-full w-full object-contain p-1.5" />
                ) : (
                  <Coins size={26} />
                )}
              </div>
              <p className="mt-4 text-[8px] font-black uppercase tracking-[0.3em] text-amber-200">{getCheckoutChannelLabel()}</p>
              <h3 className="mt-2 text-2xl font-black uppercase italic tracking-tight text-white">{selectedGoldPack.displayName}</h3>
              <p className="mt-2 text-[11px] font-bold leading-relaxed text-white/72">{selectedGoldPack.description}</p>
            </div>

            <div className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {BILLING_CATALOG.map(pack => (
                  <button
                    key={pack.code}
                    type="button"
                    onClick={() => setSelectedGoldPack(pack)}
                    className={`rounded-2xl border p-3 text-left transition ${
                      selectedGoldPack.code === pack.code
                        ? 'border-amber-300/45 bg-amber-300/12'
                        : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-black/25">
                      {pack.imagePath ? (
                        <img src={pack.imagePath} alt="" className="h-full w-full object-contain p-1" />
                      ) : (
                        <Coins size={16} className="text-amber-100" />
                      )}
                    </div>
                    <p className="mt-2 text-sm font-black italic text-white">{pack.goldAmount ?? pack.amountLabel}</p>
                    <p className="mt-1 text-[7px] font-black uppercase tracking-widest text-amber-200">
                      {pack.goldAmount ? 'ouro' : 'passe'}
                    </p>
                    <p className="mt-2 text-[8px] font-black uppercase tracking-widest text-white/45">{formatBrl(pack.brlPrice)}</p>
                  </button>
                ))}
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-[8px] font-black uppercase tracking-[0.25em] text-white/35">Regra do produto</p>
                <p className="mt-2 text-[11px] font-bold leading-relaxed text-white/75">
                  {getBillingReadinessCopy(selectedGoldPack)} Chuteiras com bonus continuam microscopicas, ligadas a evolucao leve, nunca a vitoria garantida.
                </p>
              </div>

              <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-3">
                <p className="text-[8px] font-black uppercase tracking-[0.25em] text-cyan-100">Separacao limpa</p>
                <p className="mt-2 text-[11px] font-bold leading-relaxed text-cyan-50/80">
                  A loja real vende ouro. A loja interna vende cosmeticos. Isso evita vender poder direto e deixa Google Play/App Store mais simples.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedGoldPack(null)}
                  className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[9px] font-black uppercase tracking-[0.25em] text-white/65 transition hover:bg-white/[0.06]"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  onClick={() => handleBillingCheckout(selectedGoldPack)}
                  disabled={isBillingBusy}
                  className="flex-1 rounded-xl border border-amber-300/35 bg-amber-300/15 px-4 py-3 text-[9px] font-black uppercase tracking-[0.25em] text-amber-100 transition hover:bg-amber-300/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isBillingBusy ? 'Processando' : canUseDevBillingPreview() ? 'Testar pacote' : 'Continuar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
