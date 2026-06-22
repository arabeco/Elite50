import React, { useEffect, useMemo, useState } from 'react';
import { Award, Briefcase, Crown, Shield, Sparkles, Trophy, UserRound } from 'lucide-react';
import { STORE_ITEMS } from '../constants/storeCatalog';
import { loadMetaStoreSnapshot, type MetaStoreSnapshot } from '../lib/metaStore';
import { useGame } from '../store/GameContext';
import { StoreItem } from '../types';
import { getStoreState } from '../utils/store';

interface ManagerPublicProfileCardProps {
  worldsPlayed: number;
  compact?: boolean;
}

export const ManagerPublicProfileCard: React.FC<ManagerPublicProfileCardProps> = ({ worldsPlayed, compact = false }) => {
  const { isAuthenticated, state } = useGame();
  const [snapshot, setSnapshot] = useState<MetaStoreSnapshot | null>(null);
  const localStore = getStoreState(state);
  const userManager = state.userManagerId ? state.managers[state.userManagerId] : null;

  useEffect(() => {
    if (!isAuthenticated) {
      setSnapshot(null);
      return;
    }

    loadMetaStoreSnapshot()
      .then(setSnapshot)
      .catch(error => {
        console.error('ManagerPublicProfileCard: failed to load profile', error);
        setSnapshot(null);
      });
  }, [isAuthenticated]);

  const ownedItemIds = useMemo(
    () => new Set(isAuthenticated ? (snapshot?.inventory || []).map(row => row.item_id) : localStore.ownedItemIds),
    [isAuthenticated, localStore.ownedItemIds, snapshot?.inventory]
  );

  const ownedItems = useMemo(
    () => STORE_ITEMS.filter(item => ownedItemIds.has(item.id)),
    [ownedItemIds]
  );

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

  const trophyItems = ownedItems.filter(item => item.category === 'BADGE');
  const titlesWon = userManager?.career.titlesWon || 0;
  const honorScore =
    (snapshot?.profile?.premium_active || localStore.circuit.premiumActive ? 30 : 0) +
    worldsPlayed * 12 +
    titlesWon * 18 +
    trophyItems.length * 28 +
    ownedItems.filter(item => ['EPIC', 'LEGENDARY'].includes(item.rarity)).length * 9;
  const tier = honorScore >= 180 ? 'Lenda urbana' : honorScore >= 90 ? 'Nome respeitado' : honorScore >= 30 ? 'Em ascensao' : 'Primeiros passos';
  const managerName = userManager?.name || 'Manager Elite';

  return (
    <section className={`mb-6 overflow-hidden rounded-[1.75rem] border border-amber-300/18 bg-black/35 shadow-[0_20px_60px_rgba(0,0,0,0.34)] backdrop-blur-xl ${compact ? 'p-4' : ''}`}>
      <div className="grid gap-0 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="relative border-b border-white/10 bg-gradient-to-br from-amber-400/16 via-slate-950 to-cyan-950/30 p-5 lg:border-b-0 lg:border-r">
          <div className="absolute right-4 top-4 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-[7px] font-black uppercase tracking-[0.26em] text-cyan-100">
            Perfil Publico
          </div>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-300/25 bg-amber-300/10 text-amber-100 shadow-[0_0_24px_rgba(251,191,36,0.12)]">
              <Crown size={30} />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-2xl font-black uppercase italic tracking-tight text-white sm:text-3xl">{managerName}</h2>
              <p className="mt-1 text-[9px] font-black uppercase tracking-[0.24em] text-white/45">{tier} - honra {honorScore}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
              <p className="text-[7px] font-black uppercase tracking-widest text-white/35">Mundos</p>
              <p className="mt-1 text-xl font-black italic text-white">{worldsPlayed}</p>
            </div>
            <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3">
              <p className="text-[7px] font-black uppercase tracking-widest text-amber-100">Titulos</p>
              <p className="mt-1 text-xl font-black italic text-white">{titlesWon}</p>
            </div>
            <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-3">
              <p className="text-[7px] font-black uppercase tracking-widest text-cyan-100">Itens</p>
              <p className="mt-1 text-xl font-black italic text-white">{ownedItems.length}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-[8px] font-black uppercase tracking-widest text-cyan-100">
              <UserRound size={12} /> Humano
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-[8px] font-black uppercase tracking-widest text-amber-100">
              <Trophy size={12} /> {trophyItems.length} trofeus
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[8px] font-black uppercase tracking-widest text-white/45">
              <Shield size={12} /> inventario privado
            </span>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.25em] text-white/40">Vitrine</p>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-white/30">3 slots escolhidos para aparecer aos outros.</p>
            </div>
            <Sparkles size={18} className="text-cyan-200" />
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {[displayedItems[0], displayedItems[1], displayedItems[2]].map((item, index) => (
              <div key={item?.id || `public-slot-${index}`} className="min-h-28 rounded-2xl border border-white/10 bg-black/35 p-2">
                <div className="flex h-14 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                  {item ? <img src={item.imagePath} alt={item.name} className="h-full w-full object-contain p-1.5" /> : <Award size={20} className="text-white/25" />}
                </div>
                <p className="mt-2 truncate text-[7px] font-black uppercase tracking-wide text-white">{item?.name || 'Slot vazio'}</p>
                <p className="text-[6px] font-black uppercase tracking-widest text-white/35">{item ? item.rarity : 'display'}</p>
              </div>
            ))}
          </div>

          <div className="mt-3 rounded-2xl border border-amber-400/18 bg-amber-400/10 p-3">
            <div className="mb-2 flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.24em] text-amber-100">
              <Briefcase size={13} /> Trofeus e carreira
            </div>
            {trophyItems.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {trophyItems.slice(0, 3).map(item => (
                  <div key={item.id} className="rounded-xl border border-white/10 bg-black/30 px-2 py-2">
                    <p className="truncate text-[7px] font-black uppercase tracking-wide text-white">{item.name}</p>
                    <p className="text-[6px] font-black uppercase tracking-widest text-amber-100/60">{item.rarity}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[9px] font-bold uppercase tracking-widest text-white/35">Sem trofeu global exibido ainda.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
