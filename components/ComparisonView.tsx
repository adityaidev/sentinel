import React from 'react';
import { AgentState, StrategicScores } from '../types';

interface ComparisonViewProps {
  reportA: AgentState;
  reportB: AgentState;
  onBack: () => void;
}

const DualRadarChart = ({ scoresA, scoresB, colorA, colorB }: { scoresA: StrategicScores, scoresB: StrategicScores, colorA: string, colorB: string }) => {
  const metrics = [
    { key: 'innovation', label: 'Innovation' },
    { key: 'market_share', label: 'Market Share' },
    { key: 'pricing_power', label: 'Pricing' },
    { key: 'brand_reputation', label: 'Brand' },
    { key: 'velocity', label: 'Velocity' }
  ] as const;

  const size = 300;
  const center = size / 2;
  const radius = 100;
  const angleStep = (Math.PI * 2) / metrics.length;

  const getPoints = (scores: StrategicScores) => {
    return metrics.map((metric, i) => {
      const value = scores[metric.key] || 0;
      const normalizedValue = Math.min(Math.max(value, 0), 100) / 100;
      const r = normalizedValue * radius;
      const angle = i * angleStep - Math.PI / 2;
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      return `${x},${y}`;
    }).join(' ');
  };

  const pointsA = getPoints(scoresA);
  const pointsB = getPoints(scoresB);
  const levels = [0.25, 0.5, 0.75, 1];

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg width={size} height={size} className="overflow-visible">
        {/* Background Web */}
        {levels.map((level, lIdx) => (
          <polygon
            key={lIdx}
            points={metrics.map((_, i) => {
              const r = radius * level;
              const angle = i * angleStep - Math.PI / 2;
              return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
            }).join(' ')}
            fill="none"
            stroke="#262626"
            strokeWidth="1"
            className="opacity-50"
          />
        ))}

        {/* Axis Lines */}
        {metrics.map((metric, i) => {
           const angle = i * angleStep - Math.PI / 2;
           const x = center + radius * Math.cos(angle);
           const y = center + radius * Math.sin(angle);
           // Label positions
           const labelR = radius + 25;
           const labelX = center + labelR * Math.cos(angle);
           const labelY = center + labelR * Math.sin(angle);
           
           return (
             <g key={i}>
                <line x1={center} y1={center} x2={x} y2={y} stroke="#262626" strokeWidth="1" />
                <text 
                  x={labelX} 
                  y={labelY} 
                  textAnchor="middle" 
                  dominantBaseline="middle" 
                  fill="#737373" 
                  className="text-[10px] uppercase font-mono tracking-wider"
                >
                  {metric.label}
                </text>
             </g>
           );
        })}

        {/* Shape A */}
        <polygon points={pointsA} fill={colorA} fillOpacity="0.2" stroke={colorA} strokeWidth="2" className="drop-shadow-lg" />
        
        {/* Shape B */}
        <polygon points={pointsB} fill={colorB} fillOpacity="0.2" stroke={colorB} strokeWidth="2" className="drop-shadow-lg" />

      </svg>
    </div>
  );
};

const MetricBar = ({ label, valA, valB, colorA, colorB }: { label: string, valA: number, valB: number, colorA: string, colorB: string }) => {
  const diff = valA - valB;
  
  return (
    <div className="grid grid-cols-12 gap-4 items-center py-3 border-b border-sentinel-border/50 hover:bg-white/5 transition-colors px-2">
      <div className="col-span-2 text-right font-mono font-bold text-white/80">{valA}</div>
      <div className="col-span-3 flex justify-end">
        <div className="h-2 rounded-full bg-sentinel-border w-full flex justify-end overflow-hidden relative">
             <div 
                className="h-full absolute right-0" 
                style={{ width: `${valA}%`, backgroundColor: colorA }}
             ></div>
        </div>
      </div>
      <div className="col-span-2 text-center text-[10px] uppercase tracking-widest text-sentinel-muted">{label}</div>
      <div className="col-span-3 flex justify-start">
        <div className="h-2 rounded-full bg-sentinel-border w-full flex justify-start overflow-hidden relative">
             <div 
                className="h-full absolute left-0" 
                style={{ width: `${valB}%`, backgroundColor: colorB }}
             ></div>
        </div>
      </div>
      <div className="col-span-2 text-left font-mono font-bold text-white/80">{valB}</div>
    </div>
  );
}

const ComparisonView: React.FC<ComparisonViewProps> = ({ reportA, reportB, onBack }) => {
  const scoresA = reportA.swotAnalysis?.scores || { innovation: 0, market_share: 0, pricing_power: 0, brand_reputation: 0, velocity: 0 };
  const scoresB = reportB.swotAnalysis?.scores || { innovation: 0, market_share: 0, pricing_power: 0, brand_reputation: 0, velocity: 0 };

  const colorA = "#3b82f6"; // Blue
  const colorB = "#a855f7"; // Purple

  return (
    <div className="max-w-6xl mx-auto mt-6 animate-fade-in-up px-2 sm:px-4 pb-20">
        {/* Navigation */}
        <button 
            onClick={onBack}
            className="mb-6 flex items-center gap-2 text-sentinel-muted hover:text-white transition-colors group"
        >
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-mono text-sm uppercase tracking-wide">Back to History</span>
        </button>

        {/* Head-to-Head Header */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16 mb-12">
            <div className="text-center md:text-right flex-1">
                <div className="text-3xl md:text-5xl font-bold text-white mb-2">{reportA.targetCompany}</div>
                <div className="text-sm font-mono text-blue-400 uppercase tracking-widest">Contender A</div>
            </div>
            
            <div className="relative">
                <div className="text-4xl md:text-6xl font-black italic text-sentinel-border opacity-50 select-none">VS</div>
            </div>

            <div className="text-center md:text-left flex-1">
                <div className="text-3xl md:text-5xl font-bold text-white mb-2">{reportB.targetCompany}</div>
                <div className="text-sm font-mono text-purple-400 uppercase tracking-widest">Contender B</div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {/* Visual Balance */}
            <div className="bg-sentinel-card border border-sentinel-border rounded-xl p-6 flex flex-col items-center justify-center min-h-[400px]">
                <h3 className="text-xs font-mono text-sentinel-muted uppercase tracking-widest mb-6">Strategic Overlap</h3>
                <DualRadarChart scoresA={scoresA} scoresB={scoresB} colorA={colorA} colorB={colorB} />
                <div className="flex gap-6 mt-6">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-xs text-sentinel-muted">{reportA.targetCompany}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                        <span className="text-xs text-sentinel-muted">{reportB.targetCompany}</span>
                    </div>
                </div>
            </div>

            {/* Tale of the Tape */}
            <div className="bg-sentinel-card border border-sentinel-border rounded-xl p-6">
                <h3 className="text-xs font-mono text-sentinel-muted uppercase tracking-widest mb-6 text-center">Tale of the Tape</h3>
                <div className="space-y-1">
                    <MetricBar label="Innovation" valA={scoresA.innovation} valB={scoresB.innovation} colorA={colorA} colorB={colorB} />
                    <MetricBar label="Market Share" valA={scoresA.market_share} valB={scoresB.market_share} colorA={colorA} colorB={colorB} />
                    <MetricBar label="Pricing Power" valA={scoresA.pricing_power} valB={scoresB.pricing_power} colorA={colorA} colorB={colorB} />
                    <MetricBar label="Brand Rep" valA={scoresA.brand_reputation} valB={scoresB.brand_reputation} colorA={colorA} colorB={colorB} />
                    <MetricBar label="Velocity" valA={scoresA.velocity} valB={scoresB.velocity} colorA={colorA} colorB={colorB} />
                </div>
                
                <div className="mt-8 p-4 bg-sentinel-bg rounded border border-sentinel-border/50 text-center">
                    <div className="text-xs text-sentinel-muted mb-2 uppercase tracking-wide">Advantage Summary</div>
                    <div className="text-lg text-white">
                        {scoresA.market_share > scoresB.market_share 
                            ? <span className="text-blue-400 font-bold">{reportA.targetCompany}</span> 
                            : <span className="text-purple-400 font-bold">{reportB.targetCompany}</span>
                        } leads with {(Math.abs(scoresA.market_share - scoresB.market_share))} point market share advantage.
                    </div>
                </div>
            </div>
        </div>

        {/* Side by Side Key Insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border-t-4 border-blue-500 bg-sentinel-card p-6 rounded-b-xl">
                 <h4 className="font-bold text-white mb-4 flex items-center justify-between">
                    <span>{reportA.targetCompany}</span>
                    <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-1 rounded">Top Strengths</span>
                 </h4>
                 <ul className="space-y-2">
                    {reportA.swotAnalysis?.strengths.slice(0, 3).map((s, i) => (
                        <li key={i} className="text-sm text-sentinel-muted flex items-start gap-2">
                            <span className="text-blue-500 mt-1">●</span> {s}
                        </li>
                    ))}
                 </ul>
            </div>
            <div className="border-t-4 border-purple-500 bg-sentinel-card p-6 rounded-b-xl">
                 <h4 className="font-bold text-white mb-4 flex items-center justify-between">
                    <span>{reportB.targetCompany}</span>
                    <span className="text-xs bg-purple-500/10 text-purple-400 px-2 py-1 rounded">Top Strengths</span>
                 </h4>
                 <ul className="space-y-2">
                    {reportB.swotAnalysis?.strengths.slice(0, 3).map((s, i) => (
                        <li key={i} className="text-sm text-sentinel-muted flex items-start gap-2">
                            <span className="text-purple-500 mt-1">●</span> {s}
                        </li>
                    ))}
                 </ul>
            </div>
        </div>
    </div>
  );
};

export default ComparisonView;