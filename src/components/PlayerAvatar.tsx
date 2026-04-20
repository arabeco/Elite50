import React from 'react';
import { Player, District } from '../types';
import { getHairAssetPath, getHairOffset, HAIR_FILES_BY_GENDER } from '../constants/avatarAssets';

export const TEAM_UNIFORM_FILES = [
  'Cópia_de_Design_sem_nome__6_-removebg-preview.png',
  'Cópia_de_Design_sem_nome__7_-removebg-preview.png',
  'Cópia_de_Design_sem_nome__8_-removebg-preview.png',
  'Cópia_de_Design_sem_nome__9_-removebg-preview.png',
  'Cópia_de_Design_sem_nome__10_-removebg-preview.png',
  'Cópia_de_Design_sem_nome__11_-removebg-preview.png',
  'Cópia_de_Design_sem_nome__12_-removebg-preview.png',
  'Cópia_de_Design_sem_nome__13_-removebg-preview.png',
  'Cópia_de_Design_sem_nome__14_-removebg-preview.png',
  'Cópia_de_Design_sem_nome__15_-removebg-preview.png',
  'Cópia_de_Design_sem_nome__16_-removebg-preview.png',
  'Cópia_de_Design_sem_nome__17_-removebg-preview.png',
  'Cópia_de_Design_sem_nome__18_-removebg-preview.png',
  'Cópia_de_Design_sem_nome__19_-removebg-preview.png',
  'Cópia_de_Design_sem_nome__20_-removebg-preview.png',
  'Cópia_de_Design_sem_nome__21_-removebg-preview.png',
  'Cópia_de_Design_sem_nome__22_-removebg-preview.png',
  'Cópia_de_Design_sem_nome__23_-removebg-preview.png',
  'Cópia_de_Design_sem_nome__26_-removebg-preview.png',
  'Cópia_de_Design_sem_nome__27_-removebg-preview.png',
  'Cópia_de_Design_sem_nome__28_-removebg-preview.png',
  'Cópia_de_Design_sem_nome__29_-removebg-preview.png',
  'Cópia_de_Design_sem_nome__30_-removebg-preview.png',
  'Cópia_de_Design_sem_nome__31_-removebg-preview.png',
  'Cópia_de_Design_sem_nome__32_-removebg-preview.png',
  'Cópia_de_Design_sem_nome__34_-removebg-preview.png',
  'Cópia_de_Design_sem_nome__35_-removebg-preview.png',
  'Cópia_de_Design_sem_nome__36_-removebg-preview.png',
  'Cópia_de_Design_sem_nome__37_-removebg-preview.png',
  'Cópia_de_Design_sem_nome__39_-removebg-preview.png',
  'Cópia_de_Design_sem_nome__40_-removebg-preview.png',
  'Cópia_de_Design_sem_nome__41_-removebg-preview.png',
];

export const getTeamUniformFile = (teamId?: string | null) => {
  const match = teamId?.match(/^t_(\d+)$/);
  if (!match) return null;

  const teamNumber = Number(match[1]);
  if (!Number.isInteger(teamNumber) || teamNumber < 1 || teamNumber > TEAM_UNIFORM_FILES.length) {
    return null;
  }

  return TEAM_UNIFORM_FILES[teamNumber - 1];
};

const MALE_HAIR_FILES = [
  'hair_1.png',
  'f6-removebg-preview.png',
  'f9-removebg-preview.png',
  'Cópia_de_Design_sem_nome__9_-removebg-preview.png',
  'Cópia_de_Design_sem_nome__10_-removebg-preview.png',
  'Cópia_de_Design_sem_nome__11_-removebg-preview.png',
  'Cópia_de_Design_sem_nome__12_-removebg-preview.png',
  'Cópia_de_Design_sem_nome__13_-removebg-preview.png',
  'Cópia_de_Design_sem_nome__14_-removebg-preview.png',
  'Cópia_de_Design_sem_nome__15_-removebg-preview.png',
  'Cópia_de_Design_sem_nome__18_-removebg-preview.png',
  'Cópia_de_Design_sem_nome__19_-removebg-preview.png',
  'Cópia_de_Design_sem_nome__20_-removebg-preview.png',
  'Cópia_de_Design_sem_nome__21_-removebg-preview.png',
];

const FEMALE_HAIR_FILES = [
  'f1-removebg-preview.png',
  'f2-removebg-preview.png',
  'f3-removebg-preview.png',
  'f4-removebg-preview.png',
  'f7-removebg-preview.png',
  'f8-removebg-preview.png',
  'f10-removebg-preview.png',
  'f11-removebg-preview.png',
  'f13-removebg-preview.png',
  'Cópia_de_Design_sem_nome__5_-removebg-preview.png',
  'Cópia_de_Design_sem_nome__6_-removebg-preview.png',
  'Cópia_de_Design_sem_nome__7_-removebg-preview.png',
  'Cópia_de_Design_sem_nome__8_-removebg-preview.png',
];

interface PlayerAvatarProps {
  player: Player;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  mode?: 'full' | 'head' | 'no-boots';
  cropBottomPercent?: number;
  className?: string;
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({ 
  player, 
  size = 'md', 
  mode = 'full',
  cropBottomPercent = 33,
  className = ''
}) => {
  const { appearance, district } = player;
  const visualSeed = Math.abs(player.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0));
  const isLegacyDefaultAppearance = appearance.bodyId === 1 && appearance.hairId === 1 && appearance.bootId === 1;
  const visualGender = isLegacyDefaultAppearance ? (visualSeed % 2 === 0 ? 'M' : 'F') : appearance.gender;
  const visualBodyId = isLegacyDefaultAppearance ? (visualSeed % 3) + 1 : appearance.bodyId;
  const hairFiles = HAIR_FILES_BY_GENDER[visualGender];
  const visualHairId = isLegacyDefaultAppearance ? (visualSeed % hairFiles.length) + 1 : appearance.hairId;
  const hairFile = hairFiles[(visualHairId - 1) % hairFiles.length];
  const hairOffset = getHairOffset(visualGender, hairFile);
  const hairOffsetX = `${hairOffset.x}%`;
  const hairOffsetY = `${hairOffset.y}%`;
  
  // Mapeamento de cores de uniforme por distrito
  const getUniformSuffix = (d: District) => {
    switch (d) {
      case 'NORTE': return 'cyan';
      case 'SUL': return 'orange';
      case 'LESTE': return 'green';
      case 'OESTE': return 'purple';
      default: return 'cyan';
    }
  };

  const sizes = {
    xs: 'w-8 h-8',
    sm: 'w-12 h-12',
    md: 'w-24 h-24',
    lg: 'w-48 h-48',
    xl: 'w-64 h-64'
  };

  const uniformSuffix = getUniformSuffix(district);
  const genderKey = visualGender === 'M' ? 'm' : 'f';

  // Assets paths - usando a pasta 'assetas' conforme solicitado
  const assetsBase = '/assetas/avatars';
  const bodyPath = `${assetsBase}/bodies/body_${genderKey}_${visualBodyId}.png`;
  const hairPath = getHairAssetPath(visualGender, hairFile);
  const teamUniformFile = getTeamUniformFile(player.contract.teamId);
  const uniformPath = teamUniformFile
    ? encodeURI(`${assetsBase}/uniforms/${teamUniformFile}`)
    : `${assetsBase}/uniforms/uniform_${uniformSuffix}.png`;
  
  // Fallback para chuteiras
  const bootId = 1; // FORÇANDO BOOT 1 PARA TESTE GLOBAL
  const bootPath = `${assetsBase}/boots/boot_1.png`;

  // Estilo para o modo 'head' (rosto)
  const headStyle: React.CSSProperties = mode === 'head' ? {
    objectFit: 'cover',
    objectPosition: 'center 1%', // Foca no rosto
    transform: 'scale(2.5)', // Dá zoom no rosto
    transformOrigin: 'center 5%',
  } : {};

  const hairStyle: React.CSSProperties = mode === 'head'
    ? {
      ...headStyle,
      left: hairOffsetX,
      top: hairOffsetY,
    }
    : {
      left: hairOffsetX,
      top: hairOffsetY,
    };

  const avatarCropStyle: React.CSSProperties = mode === 'head' || cropBottomPercent <= 0 ? {} : {
    clipPath: `inset(0 0 ${cropBottomPercent}% 0)`,
  };

  return (
    <div className={`relative overflow-hidden rounded-xl ${sizes[size]} ${className}`}>
      <div className="absolute inset-0" style={avatarCropStyle}>
        {/* Camada 1: Corpo */}
        <img 
          src={bodyPath} 
          alt="Body" 
          className="absolute inset-0 w-full h-full object-contain z-10"
          style={headStyle}
        />
        
        {/* Camada 2: Uniforme */}
        <img 
          src={uniformPath} 
          alt="Uniform" 
          className="absolute inset-0 w-full h-full object-contain z-20"
          style={headStyle}
        />

        {/* Camada 3: Cabelo */}
        <img 
          src={hairPath} 
          alt="Hair" 
          className="absolute w-full h-full object-contain z-30"
          style={hairStyle}
        />

        {/* Camada 4: Chuteiras */}
        {mode === 'full' && (
          <img 
            src={bootPath} 
            alt="Boots" 
            style={{
              position: 'absolute',
              bottom: '5%',
              left: '45%',
              width: '59%',
              height: 'auto',
              transform: 'translateX(-50%)',
              objectFit: 'contain',
              zIndex: 100,
              pointerEvents: 'none'
            }}
          />
        )}
      </div>
    </div>
  );
};
