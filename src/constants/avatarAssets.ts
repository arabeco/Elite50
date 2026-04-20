export type AvatarGender = 'M' | 'F';

export const MALE_HAIR_FILES = [
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
  'Cópia_de_Design_sem_nome__22_-removebg-preview.png',
  'Cópia_de_Design_sem_nome__23_-removebg-preview.png',
  'Cópia_de_Design_sem_nome__24_-removebg-preview.png',
];

export const FEMALE_HAIR_FILES = [
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
  'Cópia_de_Design_sem_nome__9_-removebg-preview.png',
  'Cópia_de_Design_sem_nome__10_-removebg-preview.png',
];

export const HAIR_FILES_BY_GENDER: Record<AvatarGender, string[]> = {
  M: MALE_HAIR_FILES,
  F: FEMALE_HAIR_FILES,
};

export const HAIR_COUNT_BY_GENDER: Record<AvatarGender, number> = {
  M: MALE_HAIR_FILES.length,
  F: FEMALE_HAIR_FILES.length,
};

export interface HairOffset {
  x: number;
  y: number;
}

export const HAIR_OFFSETS: Record<string, HairOffset> = {
  'F/f1-removebg-preview.png': { x: 0.2, y: -0.3 },
  'F/f2-removebg-preview.png': { x: 0.75, y: 0 },
  'F/f4-removebg-preview.png': { x: 0.75, y: -0.75 },
  'F/f7-removebg-preview.png': { x: 0.5, y: 0 },
  'F/f8-removebg-preview.png': { x: 0.5, y: 0 },
  'F/f10-removebg-preview.png': { x: 0.75, y: 0 },
  'F/f11-removebg-preview.png': { x: 0.5, y: 0 },
  'F/f13-removebg-preview.png': { x: 0.25, y: -0.75 },
  'F/Cópia_de_Design_sem_nome__5_-removebg-preview.png': { x: 0.75, y: -0.75 },
  'F/Cópia_de_Design_sem_nome__6_-removebg-preview.png': { x: 0, y: -1 },
  'F/Cópia_de_Design_sem_nome__7_-removebg-preview.png': { x: 0.75, y: -0.75 },
  'F/Cópia_de_Design_sem_nome__8_-removebg-preview.png': { x: 0, y: 0 },
  'F/Cópia_de_Design_sem_nome__9_-removebg-preview.png': { x: 0.25, y: -0.5 },
  'F/Cópia_de_Design_sem_nome__10_-removebg-preview.png': { x: 0.25, y: -0.25 },
  'M/Cópia_de_Design_sem_nome__14_-removebg-preview.png': { x: 0, y: -0.75 },
  'F/default': { x: -0.5, y: 0 },
  'M/default': { x: 0, y: 0 },
};

export const getHairOffset = (gender: AvatarGender, fileName: string): HairOffset => {
  return HAIR_OFFSETS[`${gender}/${fileName}`] || HAIR_OFFSETS[`${gender}/default`] || { x: 0, y: 0 };
};

export const getHairAssetPath = (gender: AvatarGender, fileName: string) => {
  const folder = gender === 'M' ? 'masc' : 'fem';
  return encodeURI(`/assetas/avatars/hair/${folder}/${fileName}`);
};
