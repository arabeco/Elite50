import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

export interface PlayerRadarDatum {
  stat: string;
  value: number;
}

/**
 * Radar do pentagono do jogador.
 *
 * Vive em um modulo proprio porque e o UNICO ponto do app que usa `recharts`.
 * Isolado assim, o Rollup consegue mandar a biblioteca inteira para um chunk
 * separado, carregado so quando o jogador abre a ficha de um atleta — em vez de
 * embarcar no bundle inicial de todo mundo. Nao volte a importar recharts fora daqui.
 */
export default function PlayerRadarChart({ data }: { data: PlayerRadarDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={190}>
      <RadarChart data={data}>
        <PolarGrid stroke="rgba(255,255,255,0.12)" />
        <PolarAngleAxis
          dataKey="stat"
          tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: 800 }}
        />
        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
        <Radar
          dataKey="value"
          stroke="rgb(34,211,238)"
          fill="rgba(34,211,238,0.22)"
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
