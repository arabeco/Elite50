import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Copy, RotateCcw } from 'lucide-react';
import {
  AvatarGender,
  getHairAssetPath,
  getHairOffset,
  HAIR_FILES_BY_GENDER,
  HairOffset
} from '../constants/avatarAssets';
import { useGameDispatch } from '../store/GameContext';

const STEP = 0.25;

export const HairCalibrationPanel: React.FC = () => {
  const { addToast } = useGameDispatch();
  const [gender, setGender] = useState<AvatarGender>('M');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [offsets, setOffsets] = useState<Record<string, HairOffset>>({});

  const hairFiles = HAIR_FILES_BY_GENDER[gender];
  const selectedFile = hairFiles[Math.min(selectedIndex, hairFiles.length - 1)];
  const selectedKey = `${gender}/${selectedFile}`;
  const selectedOffset = offsets[selectedKey] || getHairOffset(gender, selectedFile);
  const bodyPath = `/assetas/avatars/bodies/body_${gender === 'M' ? 'm' : 'f'}_1.png`;
  const uniformPath = '/assetas/avatars/uniforms/district-norte-uniform.png';
  const hairPath = getHairAssetPath(gender, selectedFile);

  const exportJson = useMemo(() => {
    const payload = {
      hairOffsets: Object.keys(offsets)
        .sort()
        .reduce<Record<string, HairOffset>>((acc, key) => {
          acc[key] = offsets[key];
          return acc;
        }, {})
    };

    return JSON.stringify(payload, null, 2);
  }, [offsets]);

  const updateOffset = (dx: number, dy: number) => {
    setOffsets(prev => ({
      ...prev,
      [selectedKey]: {
        x: Number((selectedOffset.x + dx).toFixed(2)),
        y: Number((selectedOffset.y + dy).toFixed(2))
      }
    }));
  };

  const resetSelected = () => {
    setOffsets(prev => {
      const next = { ...prev };
      delete next[selectedKey];
      return next;
    });
  };

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(exportJson);
      addToast('JSON de cabelos copiado', 'success');
    } catch {
      addToast('Nao consegui copiar automaticamente', 'warning');
    }
  };

  const selectGender = (nextGender: AvatarGender) => {
    setGender(nextGender);
    setSelectedIndex(0);
  };

  return (
    <div className="glass-card-neon white-gradient-sheen border border-cyan-500/25 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-[0_0_30px_rgba(34,211,238,0.12)] flex flex-col gap-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-28 h-28 bg-cyan-500/5 rounded-full blur-2xl -mr-12 -mt-12" />

      <div className="relative z-10 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[9px] sm:text-[11px] font-black text-cyan-300 uppercase tracking-[0.2em]">
            Calibrador de cabelo
          </h3>
          <p className="mt-1 text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-slate-500">
            Ajuste por arquivo e copie o JSON
          </p>
        </div>
        <button
          type="button"
          onClick={copyJson}
          className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-[8px] font-black uppercase tracking-widest text-cyan-100 transition hover:bg-cyan-500/20"
        >
          <Copy size={13} /> Copiar
        </button>
      </div>

      <div className="relative z-10 grid gap-4 lg:grid-cols-[220px_1fr]">
        <div className="space-y-3">
          <div className="flex rounded-xl border border-white/10 bg-black/35 p-1">
            {(['M', 'F'] as AvatarGender[]).map(item => (
              <button
                key={item}
                type="button"
                onClick={() => selectGender(item)}
                className={`flex-1 rounded-lg py-2 text-[9px] font-black uppercase tracking-widest transition ${
                  gender === item ? 'bg-cyan-400 text-black' : 'text-white/35 hover:text-white'
                }`}
              >
                {item === 'M' ? 'Masc' : 'Fem'}
              </button>
            ))}
          </div>

          <div className="relative mx-auto h-[270px] w-[180px] overflow-hidden rounded-2xl border border-white/10 bg-[#02060d]">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.1)_1px,transparent_1px)] bg-[size:18px_18px] opacity-25" />
            <img src={bodyPath} alt="" className="absolute inset-0 z-10 h-full w-full object-contain" />
            <img src={uniformPath} alt="" className="absolute inset-0 z-20 h-full w-full object-contain" />
            <img
              src={hairPath}
              alt=""
              className="absolute z-30 h-full w-full object-contain"
              style={{ left: `${selectedOffset.x}%`, top: `${selectedOffset.y}%` }}
            />
          </div>

          <div className="rounded-xl border border-white/10 bg-black/35 p-3">
            <p className="text-[8px] font-black uppercase tracking-widest text-white/35">Arquivo</p>
            <p className="mt-1 break-all text-[9px] font-bold text-white">{selectedFile}</p>
            <p className="mt-2 text-[8px] font-black uppercase tracking-widest text-cyan-300">
              {selectedKey} | x {selectedOffset.x}% | y {selectedOffset.y}%
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-5 gap-2">
            <button
              type="button"
              onClick={() => updateOffset(-STEP, 0)}
              className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-white/60 transition hover:text-white"
              title="Mover para esquerda"
            >
              <ArrowLeft size={16} className="mx-auto" />
            </button>
            <button
              type="button"
              onClick={() => updateOffset(STEP, 0)}
              className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-white/60 transition hover:text-white"
              title="Mover para direita"
            >
              <ArrowRight size={16} className="mx-auto" />
            </button>
            <button
              type="button"
              onClick={() => updateOffset(0, -STEP)}
              className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-white/60 transition hover:text-white"
              title="Subir"
            >
              <ArrowUp size={16} className="mx-auto" />
            </button>
            <button
              type="button"
              onClick={() => updateOffset(0, STEP)}
              className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-white/60 transition hover:text-white"
              title="Descer"
            >
              <ArrowDown size={16} className="mx-auto" />
            </button>
            <button
              type="button"
              onClick={resetSelected}
              className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-white/60 transition hover:text-white"
              title="Resetar este cabelo"
            >
              <RotateCcw size={16} className="mx-auto" />
            </button>
          </div>

          <div className="grid max-h-[250px] grid-cols-2 gap-2 overflow-y-auto pr-1 slim-scrollbar sm:grid-cols-3">
            {hairFiles.map((file, index) => {
              const key = `${gender}/${file}`;
              const adjusted = !!offsets[key];
              const active = index === selectedIndex;
              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => setSelectedIndex(index)}
                  className={`rounded-xl border p-2 text-left transition ${
                    active ? 'border-cyan-400 bg-cyan-500/15' : 'border-white/10 bg-black/30 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="mx-auto mb-2 h-16 w-16 overflow-hidden rounded-lg bg-black/60">
                    <img src={getHairAssetPath(gender, file)} alt="" className="h-full w-full object-contain" />
                  </div>
                  <p className="truncate text-[8px] font-black uppercase tracking-widest text-white/70">
                    #{index + 1} {adjusted ? '*' : ''}
                  </p>
                  <p className="truncate text-[7px] font-bold text-white/30">{file}</p>
                </button>
              );
            })}
          </div>

          <textarea
            readOnly
            value={exportJson}
            className="h-28 w-full resize-none rounded-xl border border-white/10 bg-black/50 p-3 font-mono text-[9px] text-cyan-100 outline-none"
          />
        </div>
      </div>
    </div>
  );
};

