import React, { useEffect, useMemo, useState } from 'react';
import { Award, Briefcase, Check, Crown, Eye, Footprints, Palette, Package, Shield, Sparkles } from 'lucide-react';
import { STORE_ITEMS } from '../constants/storeCatalog';
import { loadMetaStoreSnapshot, updateProfileDisplaySlots, type MetaStoreSnapshot } from '../lib/metaStore';
import { useGame } from '../store/GameContext';
import { StoreItem } from '../types';
import { equipManagerItem, getStoreState } from '../utils/store';

type InventoryTab = 'all' | 'boots' | 'manager' | 'badges' | 'club' | 'misc';

interface ManagerProfileHubProps {
  worldsPlayed: number;
}

export const ManagerProfileHub: React.FC<ManagerProfileHubProps> = ({ worldsPlayed }) => {
  const { addToast, isAuthenticated, state, setState, saveGame } = useGame();
  const [snapshot, setSnapshot] = useState<MetaStoreSnapshot | null>(null);
  const [activeTab, setActiveTab] = useState<InventoryTab>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const localStore = getStoreState(state);

  const refreshSnapshot = async () => {
    if (!isAuthenticated) {
      setSnapshot(null);
      return;
    }

    try {
      setIsLoading(true);
      setSnapshot(await loadMetaStoreSnapshot());
    } catch (error) {
      console.error('ManagerProfileHub: failed to load meta inventory', error);
      addToast('Nao foi possivel carregar o perfil global.', 'warning');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshSnapshot();
  }, [isAuthenticated]);

  const ownedItemIds = useMemo(
    () => new Set(isAuthenticated ? (snapshot?.inventory || []).map(row => row.item_id) : localStore.ownedItemIds),
    [isAuthenticated, localStore.ownedItemIds, snapshot?.inventory]
  );

  const ownedItems = useMemo(
    () => STORE_ITEMS.filter(item => ownedItemIds.has(item.id)),
    [ownedItemIds]
  );

  const ownedBoots = ownedItems.filter(item => item.category === 'BOOT');
  const ownedManagerItems = ownedItems.filter(item => item.category === 'ACCESSORY');
  const ownedBadges = ownedItems.filter(item => item.category === 'BADGE');
  const ownedClubItems = ownedItems.filter(item => item.category === 'KIT' || item.category === 'LOGO');
  const ownedMiscItems = ownedItems.filter(item => item.category === 'PASS');
  const displayableIds = STORE_ITEMS
    .filter(item => item.category === 'ACCESSORY' || item.category === 'BADGE')
    .map(item => item.id);

  const displayedItems = useMemo(() => {
    if (!isAuthenticated) {
      return localStore.equippedManagerItemIds
        .map(itemId => STORE_ITEMS.find(item => item.id === itemId))
        .filter((item): item is StoreItem => !!item && (item.category === 'ACCESSORY' || item.category === 'BADGE'))
        .slice(0, 3);
    }

    return (snapshot?.inventory || [])
      .filter(row => row.is_equipped)
      .sort((a, b) => Number(a.equipped_context?.slot || 99) - Number(b.equipped_context?.slot || 99))
      .map(row => STORE_ITEMS.find(item => item.id === row.item_id))
      .filter((item): item is StoreItem => !!item && (item.category === 'ACCESSORY' || item.category === 'BADGE'))
      .slice(0, 3);
  }, [isAuthenticated, localStore.equippedManagerItemIds, snapshot?.inventory]);

  const displayedIds = new Set(displayedItems.map(item => item.id));
  const honorScore =
    (snapshot?.profile?.premium_active || localStore.circuit.premiumActive ? 30 : 0) +
    worldsPlayed * 12 +
    ownedBadges.length * 28 +
    ownedManagerItems.length * 14 +
    ownedClubItems.length * 5 +
    ownedBoots.filter(item => ['RARE', 'EPIC', 'LEGENDARY'].includes(item.rarity)).length * 6;
  const tier = honorScore >= 180 ? 'Lenda urbana' : honorScore >= 90 ? 'Nome respeitado' : honorScore >= 30 ? 'Em ascensao' : 'Primeiros passos';

  const tabItems = activeTab === 'all'
    ? ownedItems
    : activeTab === 'boots'
      ? ownedBoots
      : activeTab === 'badges'
        ? ownedBadges
        : activeTab === 'club'
          ? ownedClubItems
          : activeTab === 'misc'
            ? ownedMiscItems
            : ownedManagerItems;

  const toggleDisplayItem = async (item: StoreItem) => {
    if (isSaving) return;
    if (item.category !== 'ACCESSORY' && item.category !== 'BADGE') return;

    if (!isAuthenticated) {
      const result = equipManagerItem(state, item.id);
      if (!result.ok) {
        addToast(result.message, 'warning');
        return;
      }

      setState(result.state);
      await saveGame(result.state);
      addToast(result.message, 'success');
      return;
    }

    try {
      setIsSaving(true);
      const isDisplayed = displayedIds.has(item.id);
      let nextIds = displayedItems.map(displayedItem => displayedItem.id).filter(id => id !== item.id);
      if (!isDisplayed) {
        if (nextIds.length >= 3) nextIds = nextIds.slice(1);
        nextIds = [...nextIds, item.id];
      }

      await updateProfileDisplaySlots(nextIds, displayableIds);
      await refreshSnapshot();
      addToast(isDisplayed ? 'Item removido da exibicao.' : 'Item exibido no perfil.', 'success');
    } catch (error) {
      console.error('ManagerProfileHub: failed to update display item', error);
      addToast('Nao foi possivel atualizar os slots do perfil.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const tabOptions = [
    { id: 'all' as const, label: 'Todos', icon: Package, count: ownedItems.length },
    { id: 'boots' as const, label: 'Chuteiras', icon: Footprints, count: ownedBoots.length },
    { id: 'manager' as const, label: 'Manager', icon: Briefcase, count: ownedManagerItems.length },
    { id: 'badges' as const, label: 'Trofeus', icon: Award, count: ownedBadges.length },
    { id: 'club' as const, label: 'Clube', icon: Palette, count: ownedClubItems.length },
    { id: 'misc' as const, label: 'Misc', icon: Sparkles, count: ownedMiscItems.length },
  ];

  return (
    <section data-onboarding="screen-inventory" className="mx-auto mb-24 max-w-6xl overflow-hidden rounded-[1.75rem] border border-white/10 bg-black/35 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:mb-6">
      <div className="grid gap-0 lg:grid-cols-[0.88fr_1.12fr]">
        <div className="relative border-b border-white/10 bg-gradient-to-br from-amber-400/14 via-slate-950 to-cyan-950/30 p-5 lg:border-b-0 lg:border-r">
          <div className="absolute right-4 top-4 rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-[7px] font-black uppercase tracking-[0.26em] text-amber-100">
            Perfil Global
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-300/10 text-amber-100">
              <Crown size={26} />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-2xl font-black uppercase italic tracking-tight text-white">Manager Elite</h2>
              <p className="mt-1 text-[9px] font-black uppercase tracking-[0.24em] text-white/45">{tier} - honra {honorScore}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
              <p className="text-[7px] font-black uppercase tracking-widest text-white/35">Mundos</p>
              <p className="mt-1 text-xl font-black italic text-white">{worldsPlayed}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
              <p className="text-[7px] font-black uppercase tracking-widest text-white/35">Itens</p>
              <p className="mt-1 text-xl font-black italic text-white">{ownedItems.length}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
              <p className="text-[7px] font-black uppercase tracking-widest text-white/35">Passe</p>
              <p className="mt-1 text-sm font-black uppercase italic text-white">{snapshot?.profile?.premium_active || localStore.circuit.premiumActive ? 'ativo' : 'off'}</p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-3">
            <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.24em] text-cyan-100">
              <Package size={13} />
              Inventario Global
            </div>
            <p className="mt-2 text-[11px] font-bold leading-relaxed text-white/65">
              Itens vivem fora do mundo: chuteiras, manager items, trofeus, logos, uniformes e misc. Hoje voce tem {ownedBoots.length} chuteira{ownedBoots.length === 1 ? '' : 's'}; em qualquer mundo, pode equipar ate {ownedBoots.length} jogador{ownedBoots.length === 1 ? '' : 'es'} ao mesmo tempo.
            </p>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.25em] text-white/40">Exibicao publica</p>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-white/30">3 slots visiveis. O inventario completo fica privado.</p>
            </div>
            <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 text-[8px] font-black uppercase tracking-widest text-amber-100">
              {displayedItems.length}/3
            </span>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {[displayedItems[0], displayedItems[1], displayedItems[2]].map((item, index) => (
              <div key={item?.id || `empty-display-${index}`} className="min-h-28 rounded-2xl border border-white/10 bg-black/35 p-2">
                <div className="flex h-14 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                  {item ? <img src={item.imagePath} alt={item.name} className="h-full w-full object-contain p-1.5" /> : <Shield size={20} className="text-white/25" />}
                </div>
                <p className="mt-2 truncate text-[7px] font-black uppercase tracking-wide text-white">{item?.name || 'Slot vazio'}</p>
                <p className="text-[6px] font-black uppercase tracking-widest text-white/35">{item ? item.category : 'item'}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {tabOptions.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex min-w-28 items-center justify-center gap-2 rounded-xl border px-3 py-3 text-[8px] font-black uppercase tracking-[0.2em] transition active:scale-[0.98] ${
                  activeTab === tab.id
                    ? 'border-cyan-300/35 bg-cyan-400 text-black'
                    : 'border-white/10 bg-white/[0.04] text-white/45 hover:text-white'
                }`}
              >
                <tab.icon size={13} />
                {tab.label}
                <span className="rounded-full bg-black/20 px-1.5 py-0.5 text-[7px]">{tab.count}</span>
              </button>
            ))}
          </div>

          <div className="mt-3 grid max-h-64 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">
            {isLoading ? (
              <div className="col-span-full rounded-xl border border-white/10 bg-white/[0.03] p-4 text-center text-[8px] font-black uppercase tracking-widest text-white/30">
                Carregando perfil...
              </div>
            ) : tabItems.length === 0 ? (
              <div className="col-span-full rounded-xl border border-dashed border-white/10 p-4 text-center text-[8px] font-black uppercase tracking-widest text-white/30">
                Nada nessa aba ainda.
              </div>
            ) : tabItems.map(item => {
              const isDisplayable = item.category === 'ACCESSORY' || item.category === 'BADGE';
              const isDisplayed = displayedIds.has(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => isDisplayable && toggleDisplayItem(item)}
                  disabled={!isDisplayable || isSaving}
                  className={`rounded-xl border p-2 text-left transition active:scale-[0.98] ${
                    isDisplayed
                      ? 'border-amber-300/35 bg-amber-300/12'
                      : 'border-white/10 bg-black/35 hover:bg-white/[0.05]'
                  } disabled:cursor-default`}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
                      <img src={item.imagePath} alt={item.name} className="h-full w-full object-contain p-1" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[7px] font-black uppercase tracking-wide text-white">{item.name}</p>
                      <p className="text-[6px] font-black uppercase tracking-widest text-white/35">{item.rarity}</p>
                    </div>
                    {isDisplayed && <Check size={13} className="text-amber-200" />}
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-[6px] font-black uppercase tracking-widest text-white/35">
                    {isDisplayable ? <Eye size={10} /> : <Sparkles size={10} />}
                    {isDisplayable ? (isDisplayed ? 'remover' : 'exibir') : item.category === 'BOOT' ? 'equipa no jogador' : item.category === 'KIT' || item.category === 'LOGO' ? 'equipa no clube' : 'colecao'}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-[8px] font-black uppercase tracking-widest text-white/35">
            <Sparkles size={12} className="text-cyan-200" />
            Chuteiras, kits e logos equipam dentro de cada mundo. Itens exibidos no perfil ficam globais.
          </div>
        </div>
      </div>
    </section>
  );
};
