import React from 'react';
import { Player, District } from '../types';

const TEAM_UNIFORM_FILES = [
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

interface PlayerAvatarProps {
  player: Player;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  mode?: 'full' | 'head' | 'no-boots';
  className?: string;
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({ 
  player, 
  size = 'md', 
  mode = 'full',
  className = ''
}) => {
  const { appearance, district } = player;
  
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
  const genderKey = appearance.gender === 'M' ? 'm' : 'f';

  // Assets paths - usando a pasta 'assetas' conforme solicitado
  const assetsBase = '/assetas/avatars';
  const bodyPath = `${assetsBase}/bodies/body_${genderKey}_${appearance.bodyId}.png`;
  const hairPath = `${assetsBase}/hair/hair_${appearance.hairId}.png`;
  const getTeamUniformFile = (teamId?: string | null) => {
    const match = teamId?.match(/^t_(\d+)$/);
    if (!match) return null;

    const teamNumber = Number(match[1]);
    if (!Number.isInteger(teamNumber) || teamNumber < 1 || teamNumber > TEAM_UNIFORM_FILES.length) {
      return null;
    }

    return TEAM_UNIFORM_FILES[teamNumber - 1];
  };

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

  const avatarCropStyle: React.CSSProperties = mode === 'head' ? {} : {
    clipPath: 'inset(0 0 33% 0)',
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

        {/* Camada 3: Cabelo (apenas se hairId for 1, pois só existe esse por enquanto) */}
        {appearance.hairId === 1 && (
          <img 
            src={hairPath} 
            alt="Hair" 
            className="absolute inset-0 w-full h-full object-contain z-30"
            style={headStyle}
          />
        )}

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
