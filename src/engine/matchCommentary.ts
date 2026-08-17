import { PlayStyle } from '../types';

export type PassCommentary = {
  phrase: string;
  keywords: string[];
};

const hash = (value: string) => [...value].reduce((sum, char) => ((sum * 31) + char.charCodeAt(0)) | 0, 7) >>> 0;
const choose = <T,>(seed: string, values: T[]) => values[hash(seed) % values.length];

const PASS_LIBRARY = {
  short: [
    { phrase: 'com um toque curto', keywords: ['TOQUE CURTO'] },
    { phrase: 'com passe de primeira', keywords: ['DE PRIMEIRA'] },
    { phrase: 'com uma tabela rapida', keywords: ['TABELA'] },
    { phrase: 'com passe rasteiro', keywords: ['PASSE RASTEIRO'] },
  ],
  progressive: [
    { phrase: 'com um passe vertical', keywords: ['PASSE VERTICAL'] },
    { phrase: 'com uma bola enfiada', keywords: ['BOLA ENFIADA'] },
    { phrase: 'com passe entre as linhas', keywords: ['ENTRE AS LINHAS'] },
    { phrase: 'com um passe que quebra a marcacao', keywords: ['QUEBRA DE LINHA'] },
  ],
  long: [
    { phrase: 'com um lancamento longo', keywords: ['LANCAMENTO'] },
    { phrase: 'com uma bola por cima da defesa', keywords: ['POR CIMA'] },
    { phrase: 'com um passe longo no espaco', keywords: ['PASSE LONGO'] },
    { phrase: 'esticando a jogada', keywords: ['BOLA LONGA'] },
  ],
  switch: [
    { phrase: 'com uma inversao de jogo', keywords: ['INVERSAO'] },
    { phrase: 'virando o jogo para o outro lado', keywords: ['VIRADA DE JOGO'] },
    { phrase: 'trocando o corredor com precisao', keywords: ['TROCA DE CORREDOR'] },
  ],
  wide: [
    { phrase: 'com um passe aberto no corredor', keywords: ['CORREDOR'] },
    { phrase: 'acionando o lado do campo', keywords: ['ABERTURA'] },
    { phrase: 'com uma bola na ponta', keywords: ['PELA PONTA'] },
  ],
} satisfies Record<string, PassCommentary[]>;

export const getPassCommentary = (seed: string, style: PlayStyle, isRecycle: boolean): PassCommentary => {
  if (isRecycle) return choose(`${seed}:short`, PASS_LIBRARY.short);
  if (style === 'Tiki-Taka' || style === 'Motor Lento') {
    return choose(`${seed}:control`, [...PASS_LIBRARY.short, ...PASS_LIBRARY.switch]);
  }
  if (style === 'Vertical' || style === 'Blitzkrieg' || style === 'Retranca Armada' || style === 'Catenaccio') {
    return choose(`${seed}:direct`, [...PASS_LIBRARY.long, ...PASS_LIBRARY.progressive]);
  }
  if (style === 'Gegenpressing') return choose(`${seed}:press`, PASS_LIBRARY.progressive);
  return choose(`${seed}:balanced`, [...PASS_LIBRARY.progressive, ...PASS_LIBRARY.switch, ...PASS_LIBRARY.wide]);
};

export const COMMENTARY_LIBRARY = {
  recovery: ['recupera a bola', 'antecipa o passe', 'vence a segunda bola', 'retoma a posse'],
  carry: ['avanca com a bola', 'carrega pelo corredor', 'progride sob pressao', 'conduz procurando espaco'],
  recycle: ['devolve para tras', 'recomeca a jogada', 'gira a posse', 'prefere o passe seguro'],
  dribble: ['corta para dentro', 'aplica uma finta curta', 'protege e gira', 'muda de direcao'],
  shotPower: ['bate forte', 'finaliza colocado', 'chuta de primeira', 'bate cruzado'],
  save: ['segura com firmeza', 'espalma para o lado', 'fecha o angulo', 'cai para fazer a defesa'],
  clearance: ['afasta o perigo', 'corta para longe', 'manda para a lateral', 'ganha a segunda bola'],
} as const;

export const commentaryChoice = <T,>(seed: string, values: readonly T[]) => choose(seed, [...values]);
