import React from 'react';
import { Player } from '../types';

export function PlayerRosterRow({ player, onClick, clubName }: { player: Player; onClick: (player: Player) => void; clubName: string }) {
  return <button type="button" onClick={() => onClick(player)} aria-label={'Ver detalhes de ' + player.nickname}
    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-white/[0.04]">
    <div className="min-w-0">
      <p className="truncate text-[11px] font-black uppercase tracking-wide text-white">{player.nickname}</p>
      <p className="text-[8px] font-bold uppercase tracking-widest text-white/35">{player.role} • {player.district}</p>
    </div>
    <div className="min-w-0 max-w-[45%] text-right">
      <p className="text-lg font-black italic text-mineral-300" aria-label={'Rating ' + player.totalRating}>{player.totalRating}</p>
      <p className="truncate text-[8px] font-bold uppercase tracking-widest text-white/25">{clubName}</p>
    </div>
  </button>;
}
