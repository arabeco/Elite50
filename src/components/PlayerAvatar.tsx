import React from 'react';
import { Player } from '../types';
import { getHairAssetPath, getHairOffset, HAIR_FILES_BY_GENDER } from '../constants/avatarAssets';
import { useGame } from '../store/GameContext';
import { getBootAssetPathByVisualId, getResolvedKitAssetPath } from '../utils/store';
import { getDistrictUniformAssetPath, getTeamUniformAssetPath } from '../utils/teamIdentity';

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
  className = '',
}) => {
  const { state } = useGame();
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

  const sizes = {
    xs: 'w-8 h-8',
    sm: 'w-12 h-12',
    md: 'w-24 h-24',
    lg: 'w-48 h-48',
    xl: 'w-64 h-64',
  };

  const assetsBase = '/assetas/avatars';
  const genderKey = visualGender === 'M' ? 'm' : 'f';
  const bodyPath = `${assetsBase}/bodies/body_${genderKey}_${visualBodyId}.png`;
  const hairPath = getHairAssetPath(visualGender, hairFile);
  const equippedKitPath = getResolvedKitAssetPath(state, player.contract.teamId);
  const uniformPath = equippedKitPath || getTeamUniformAssetPath(player.contract.teamId) || getDistrictUniformAssetPath(district);
  const bootId = Math.max(1, appearance.bootId || 1);
  const bootPath = getBootAssetPathByVisualId(bootId);

  const headStyle: React.CSSProperties = mode === 'head' ? {
    objectFit: 'cover',
    objectPosition: 'center 1%',
    transform: 'scale(2.5)',
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
        <img
          src={bodyPath}
          alt="Body"
          className="absolute inset-0 w-full h-full object-contain z-10"
          style={headStyle}
        />

        <img
          src={uniformPath}
          alt="Uniform"
          className="absolute inset-0 w-full h-full object-contain z-20"
          style={headStyle}
        />

        <img
          src={hairPath}
          alt="Hair"
          className="absolute w-full h-full object-contain z-30"
          style={hairStyle}
        />

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
              pointerEvents: 'none',
            }}
          />
        )}
      </div>
    </div>
  );
};
