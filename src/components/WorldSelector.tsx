import React, { useState } from 'react';
import { useGame } from '../store/GameContext';
import { Globe, Plus, ChevronRight, LogOut, Users, Trash2, KeyRound, RefreshCcw, CalendarDays, Activity } from 'lucide-react';
import { generateInitialState } from '../engine/generator';
import { DEFAULT_TIME_SPEED, MAX_CREATED_WORLDS_PER_USER, TEST_TIME_SPEED } from '../constants/gameConstants';
import { loadMetaStoreSnapshot } from '../lib/metaStore';
import { getStoreState } from '../utils/store';
import { STORE_ITEMS_BY_ID } from '../constants/storeCatalog';
import { ManagerPublicProfileCard } from './ManagerPublicProfileCard';

export const WorldSelector: React.FC = () => {
  const { worlds, publicWorlds, setWorldId, loadGame, joinGame, joinGameByCode, setState, saveGame, refreshWorlds, deleteWorld, logout, isSyncing, requestConfirm, addToast } = useGame();
  const [isCreating, setIsCreating] = useState(false);
  const [newWorldName, setNewWorldName] = useState('');
  const [isPublicWorld, setIsPublicWorld] = useState(false);
  const [newWorldClockProfile, setNewWorldClockProfile] = useState<'REAL' | 'TEST'>('REAL');
  const canUseDevClock = import.meta.env.DEV;
  const [activeTab, setActiveTab] = useState<'my-worlds' | 'community'>('my-worlds');
  const [joinCode, setJoinCode] = useState('');
  const createdWorldCount = worlds.filter(world => !world.isLocalOnly && world.isCreator !== false).length;
  const hasReachedCreatedWorldLimit = createdWorldCount >= MAX_CREATED_WORLDS_PER_USER;

  const getWorldPhaseInfo = (world: typeof worlds[number]) => {
    const currentDay = world.currentDay ?? -1;
    const season = world.currentSeason || 2050;
    const status = world.status || 'LOBBY';

    if (status === 'LOBBY' && currentDay < 0) {
      return {
        label: world.startScheduledAt ? 'Inicio agendado' : 'Aguardando inicio',
        detail: world.startScheduledAt ? 'Servidor abre o Draft no horario' : 'GM ainda nao iniciou',
        tone: world.startScheduledAt ? 'amber' : 'slate',
        season,
        day: 'Pre-inicio',
      };
    }

    if (status === 'LOBBY' && currentDay < 2) {
      return {
        label: 'Draft Genesis',
        detail: currentDay <= 0 ? 'Dia 0: monte lista' : 'Dia 1: ultimo ajuste',
        tone: 'cyan',
        season,
        day: `Dia ${currentDay}`,
      };
    }

    return {
      label: world.phase === 'OFFSEASON' ? 'Offseason' : world.phase === 'ELITE_CUP' ? 'Elite Cup' : status === 'ACTIVE' ? 'Temporada ativa' : status,
      detail: world.phase || 'Mundo sincronizado',
      tone: status === 'ACTIVE' ? 'emerald' : 'purple',
      season,
      day: currentDay >= 0 ? `Dia ${currentDay}` : 'Dia 0',
    };
  };

  const phaseToneClass = (tone: string) => {
    if (tone === 'amber') return 'border-amber-400/30 bg-amber-400/10 text-amber-200';
    if (tone === 'cyan') return 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200';
    if (tone === 'emerald') return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200';
    if (tone === 'purple') return 'border-purple-400/30 bg-purple-400/10 text-purple-200';
    return 'border-white/10 bg-white/[0.04] text-slate-300';
  };

  const handleSelectWorld = async (id: string, isPublic: boolean = false) => {
    if (isPublic) {
      await joinGame(id);
    } else {
      await loadGame(id);
    }
  };

  const handleCreateWorld = async () => {
    if (!newWorldName.trim()) {
      addToast('Digite um nome para criar o mundo.', 'warning');
      return;
    }
    if (hasReachedCreatedWorldLimit) {
      addToast(`Limite de ${MAX_CREATED_WORLDS_PER_USER} mundos criados atingido. Delete um mundo antigo antes de criar outro.`, 'warning');
      return;
    }

    try {
      const id = Date.now().toString();
      const joinCode = `ELITE-${id.slice(-6)}`;
      const initialState = generateInitialState();
      const clockConfig = newWorldClockProfile === 'TEST'
        ? { profile: 'TEST' as const, timeSpeed: TEST_TIME_SPEED, label: 'Dev: 1 dia a cada 10 min' }
        : { profile: 'REAL' as const, timeSpeed: DEFAULT_TIME_SPEED, label: 'Tempo real' };
      (initialState.world as any).name = newWorldName;

      // Set status to LOBBY to trigger onboarding via Dashboard -> NewGameFlow
      initialState.world.status = 'LOBBY';
      initialState.world.clock = clockConfig;
      initialState.world.isPublic = isPublicWorld;
      initialState.world.access = {
        visibility: isPublicWorld ? 'PUBLIC' : 'PRIVATE',
        allowObservers: true,
        allowMidSeasonJoin: true,
        allowTakeover: true,
        joinCode
      };
      initialState.worldId = id;
      initialState.isCreator = true;
      initialState.userTeamId = null; // No team selected yet

      let hydratedState = initialState;
      try {
        const snapshot = await loadMetaStoreSnapshot();
        const remoteOwnedItemIds = snapshot.inventory.map(item => item.item_id);
        const store = getStoreState(initialState);
        hydratedState = {
          ...initialState,
          store: {
            ...store,
            ownedItemIds: Array.from(new Set([...store.ownedItemIds, ...remoteOwnedItemIds])),
            equippedManagerItemIds: snapshot.inventory
              .filter(item => {
                const storeItem = STORE_ITEMS_BY_ID[item.item_id];
                return item.is_equipped && !!storeItem && (storeItem.category === 'ACCESSORY' || storeItem.category === 'BADGE');
              })
              .sort((a, b) => Number(a.equipped_context?.slot || 99) - Number(b.equipped_context?.slot || 99))
              .map(item => item.item_id)
              .slice(0, 3),
            circuit: {
              ...store.circuit,
              premiumActive: snapshot.profile?.premium_active ?? store.circuit.premiumActive,
              seasonRunsCompleted: snapshot.circuit?.season_runs_completed ?? store.circuit.seasonRunsCompleted,
            },
          },
        };
      } catch {
        hydratedState = initialState;
      }

      // Set local state
      setState(hydratedState);
      setWorldId(id);

      // Save to supabase
      await saveGame(hydratedState, id);
      await refreshWorlds();

      setIsCreating(false);
      setNewWorldName('');
      setIsPublicWorld(false);
      setNewWorldClockProfile('REAL');
      addToast('Mundo criado. Escolha sua origem de carreira.', 'success');
    } catch (error) {
      console.error('Create world error:', error);
      addToast('Nao foi possivel criar o mundo agora.', 'error');
    }
  };

  const handleJoinByCode = async () => {
    if (!joinCode.trim()) {
      addToast('Digite um codigo de mundo para entrar.', 'warning');
      return;
    }
    await joinGameByCode(joinCode);
  };


  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-[#050814] text-slate-300 font-sans flex flex-col items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-cyan-500/10 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-purple-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-6xl">
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-3xl mb-6 shadow-[0_0_30px_rgba(34,211,238,0.1)]">
            <Globe size={48} className="text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)]" />
          </div>
          <h1 className="text-4xl font-black text-white uppercase tracking-[0.2em] mb-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
            Multiverso <span className="text-cyan-400">Elite</span>
          </h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Explore as linhas do tempo disponíveis</p>
        </div>

        <ManagerPublicProfileCard worldsPlayed={worlds.length} />

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
          <div className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-cyan-200">
                Criados {createdWorldCount}/{MAX_CREATED_WORLDS_PER_USER}
              </span>
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                Salvos {worlds.length}
              </span>
              {hasReachedCreatedWorldLimit && (
                <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-amber-200">
                  Delete um mundo antigo para criar outro
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => refreshWorlds()}
            disabled={isSyncing}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-300 transition hover:border-cyan-400/40 hover:text-cyan-200 disabled:cursor-wait disabled:opacity-50"
          >
            <RefreshCcw size={14} className={isSyncing ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 mb-8 bg-black/40 p-1 rounded-2xl border border-white/5">
          <button
            onClick={() => setActiveTab('my-worlds')}
            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'my-worlds'
              ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20'
              : 'text-slate-500 hover:text-slate-300'
              }`}
          >
            Meus Mundos
          </button>
          <button
            onClick={() => setActiveTab('community')}
            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'community'
              ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
              : 'text-slate-500 hover:text-slate-300'
              }`}
          >
            Comunidade
          </button>
        </div>

        <div className="mb-5 rounded-2xl border border-cyan-500/25 bg-black/45 p-3 shadow-[0_0_24px_rgba(34,211,238,0.08)]">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-300" />
              <input
                type="text"
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                onKeyDown={(event) => event.key === 'Enter' && handleJoinByCode()}
                placeholder="ENTRAR POR CODIGO: ELITE-123456"
                className="w-full rounded-xl border border-white/10 bg-black/45 py-3 pl-10 pr-4 text-xs font-black uppercase tracking-widest text-white outline-none transition placeholder:text-slate-700 focus:border-cyan-400/60"
              />
            </div>
            <button
              type="button"
              disabled={isSyncing || !joinCode.trim()}
              onClick={handleJoinByCode}
              className="rounded-xl border border-cyan-400/35 bg-cyan-400 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-black transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Entrar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeTab === 'my-worlds' ? (
            <>
              {worlds.length === 0 && (
                <div className="col-span-full rounded-2xl border border-dashed border-cyan-400/20 bg-cyan-400/[0.04] p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-200">Lobby limpo</p>
                      <h3 className="mt-2 text-xl font-black uppercase tracking-wider text-white">Crie ou entre em um mundo</h3>
                      <p className="mt-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                        Use codigo de convite ou abra uma comunidade. Mundo criado entra no lobby para escolher clube.
                      </p>
                    </div>
                    <Globe size={42} className="text-cyan-300/50" />
                  </div>
                </div>
              )}

              {worlds.map((world) => {
                const phaseInfo = getWorldPhaseInfo(world);
                return (
                <div
                  key={world.id}
                  className="group relative bg-black/40 backdrop-blur-xl border border-white/5 hover:border-cyan-500/50 rounded-2xl p-6 text-left transition-all duration-300 hover:shadow-[0_0_30px_rgba(34,211,238,0.1)] overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
                    <Globe size={64} className="text-cyan-400" />
                  </div>

                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-2">
                      <div className="min-w-0">
                        <h3 className="text-xl font-black text-white uppercase tracking-wider group-hover:text-cyan-400 transition-colors truncate">
                          {world.name}
                        </h3>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-[0.18em] ${
                              world.isLocalOnly
                                ? 'border-amber-400/30 bg-amber-500/10 text-amber-200'
                                : 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
                            }`}
                          >
                            {world.isLocalOnly ? 'Cache Local' : 'Sincronizado'}
                          </span>
                          <span className={`rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-[0.18em] ${phaseToneClass(phaseInfo.tone)}`}>
                            {phaseInfo.label}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const confirmed = await requestConfirm({
                            title: 'Deletar mundo',
                            message: `Deseja deletar "${world.name}"? Esta acao nao pode ser desfeita.`,
                            confirmLabel: 'Deletar',
                            tone: 'danger',
                          });
                          if (!confirmed) return;
                          await deleteWorld(world.id);
                        }}
                        className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-red-400 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100"
                        title="Deletar Mundo"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                        <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">
                          <CalendarDays size={12} />
                          Temporada
                        </div>
                        <div className="mt-1 text-sm font-black uppercase tracking-wide text-white">
                          {phaseInfo.season}
                        </div>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                        <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">
                          <Activity size={12} />
                          Dia
                        </div>
                        <div className="mt-1 text-sm font-black uppercase tracking-wide text-white">
                          {phaseInfo.day}
                        </div>
                      </div>
                      <div className="col-span-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                        <div className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">
                          Fase atual
                        </div>
                        <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-300">
                          {phaseInfo.detail}
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSelectWorld(world.id)}
                    className="mt-6 w-full flex items-center justify-between group/enter"
                  >
                    <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0">
                      Entrar no Mundo
                    </span>
                    <ChevronRight size={16} className="text-cyan-500 transform group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              )})}

              {isCreating ? (
                <div className="bg-black/60 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-6 shadow-[0_0_30px_rgba(34,211,238,0.15)] animate-in zoom-in-95 duration-300">
                  <h3 className="text-sm font-black text-cyan-400 uppercase tracking-widest mb-4">Novo Universo</h3>
                  <input
                    autoFocus
                    type="text"
                    value={newWorldName}
                    onChange={(e) => setNewWorldName(e.target.value)}
                    placeholder="NOME DO MUNDO..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold focus:border-cyan-500/50 focus:outline-none transition-all placeholder:text-slate-700 uppercase tracking-widest mb-4"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateWorld()}
                  />
                  <label className="mb-4 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <input
                      type="checkbox"
                      checked={isPublicWorld}
                      onChange={(e) => setIsPublicWorld(e.target.checked)}
                      className="h-4 w-4 accent-cyan-400"
                    />
                    Mostrar na comunidade
                  </label>
                  <div className="mb-4">
                    <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Ritmo do mundo
                    </div>
                    <div className={`grid gap-2 ${canUseDevClock ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      <button
                        type="button"
                        onClick={() => setNewWorldClockProfile('REAL')}
                        className={`rounded-xl border px-3 py-3 text-left transition-all ${newWorldClockProfile === 'REAL'
                          ? 'border-cyan-400/50 bg-cyan-500/12 text-white'
                          : 'border-white/10 bg-black/30 text-slate-500 hover:border-white/20 hover:text-slate-300'
                          }`}
                      >
                        <div className="text-[10px] font-black uppercase tracking-widest">Real</div>
                        <div className={`mt-1 text-[9px] font-bold uppercase tracking-wide ${newWorldClockProfile === 'REAL' ? 'text-cyan-200' : 'text-slate-600'}`}>1 dia = 24h</div>
                      </button>
                      {canUseDevClock && (
                        <button
                          type="button"
                          onClick={() => setNewWorldClockProfile('TEST')}
                          className={`rounded-xl border px-3 py-3 text-left transition-all ${newWorldClockProfile === 'TEST'
                            ? 'border-amber-400/50 bg-amber-500/12 text-white'
                            : 'border-white/10 bg-black/30 text-slate-500 hover:border-white/20 hover:text-slate-300'
                            }`}
                        >
                          <div className="text-[10px] font-black uppercase tracking-widest">Teste</div>
                          <div className={`mt-1 text-[9px] font-bold uppercase tracking-wide ${newWorldClockProfile === 'TEST' ? 'text-amber-200' : 'text-slate-600'}`}>1 dia = 10 min</div>
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateWorld}
                      className="flex-1 bg-cyan-500 hover:bg-cyan-400 text-black font-black text-[10px] uppercase tracking-widest py-3 rounded-xl transition-all shadow-lg shadow-cyan-500/20"
                    >
                      Confirmar
                    </button>
                    <button
                      onClick={() => setIsCreating(false)}
                      className="flex-1 bg-white/5 hover:bg-white/10 text-white font-black text-[10px] uppercase tracking-widest py-3 rounded-xl transition-all"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  disabled={hasReachedCreatedWorldLimit}
                  onClick={() => {
                    if (hasReachedCreatedWorldLimit) {
                      addToast(`Limite de ${MAX_CREATED_WORLDS_PER_USER} mundos criados atingido. Delete um mundo antigo antes.`, 'warning');
                      return;
                    }
                    setIsCreating(true);
                  }}
                  className={`group rounded-2xl border border-dashed p-6 flex flex-col items-center justify-center gap-4 transition-all duration-300 ${
                    hasReachedCreatedWorldLimit
                      ? 'cursor-not-allowed border-amber-400/20 bg-amber-500/5'
                      : 'bg-black/20 border-white/10 hover:border-cyan-500/50 hover:bg-cyan-500/5'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                    hasReachedCreatedWorldLimit
                      ? 'bg-amber-500/10'
                      : 'bg-white/5 group-hover:bg-cyan-500/20 group-hover:scale-110'
                  }`}>
                    <Plus size={24} className={hasReachedCreatedWorldLimit ? 'text-amber-300/60' : 'text-slate-500 group-hover:text-cyan-400'} />
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                    hasReachedCreatedWorldLimit ? 'text-amber-200/70' : 'text-slate-500 group-hover:text-cyan-400'
                  }`}>
                    {hasReachedCreatedWorldLimit ? `Limite ${createdWorldCount}/${MAX_CREATED_WORLDS_PER_USER}` : 'Criar Novo Universo'}
                  </span>
                </button>
              )}
            </>
          ) : (
            <>
              {publicWorlds.length > 0 ? (
                publicWorlds.map((world) => {
                  const phaseInfo = getWorldPhaseInfo(world);
                  return (
                  <button
                    key={world.id}
                    onClick={() => handleSelectWorld(world.id, true)}
                    className="group relative bg-black/40 backdrop-blur-xl border border-white/5 hover:border-purple-500/50 rounded-2xl p-6 text-left transition-all duration-300 hover:shadow-[0_0_30px_rgba(168,85,247,0.1)] overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
                      <Globe size={64} className="text-purple-400" />
                    </div>

                    <div className="relative z-10">
                      <h3 className="text-xl font-black text-white uppercase tracking-wider mb-2 group-hover:text-purple-400 transition-colors">
                        {world.name}
                      </h3>
                      <div className="flex flex-col gap-2">
                        <span className={`w-fit rounded-full border px-2 py-1 text-[8px] font-black uppercase tracking-[0.18em] ${phaseToneClass(phaseInfo.tone)}`}>
                          {phaseInfo.label}
                        </span>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                          <Users size={12} />
                          Criado por: {world.userId.substring(0, 8)}...
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                            <div className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">Temporada</div>
                            <div className="mt-1 text-sm font-black uppercase tracking-wide text-white">{phaseInfo.season}</div>
                          </div>
                          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                            <div className="text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">Dia</div>
                            <div className="mt-1 text-sm font-black uppercase tracking-wide text-white">{phaseInfo.day}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between">
                      <span className="text-[10px] font-black text-purple-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0">
                        Entrar no mundo
                      </span>
                      <ChevronRight size={16} className="text-purple-500 transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                )})
              ) : (
                <div className="col-span-full py-12 text-center bg-black/20 border border-dashed border-white/5 rounded-2xl">
                  <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest">Nenhum mundo público encontrado no momento.</p>
                </div>
              )}
            </>
          )}
        </div>

        <button
          onClick={handleLogout}
          className="mt-12 mx-auto flex items-center gap-2 px-6 py-3 bg-red-500/5 hover:bg-red-500/10 border border-red-500/20 rounded-full text-red-400 text-[10px] font-black uppercase tracking-widest transition-all group"
        >
          <LogOut size={14} className="group-hover:-translate-x-1 transition-transform" />
          Encerrar Sessão
        </button>
      </div>
    </div>
  );
};
