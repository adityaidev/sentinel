
import React from 'react';
import { AgentRole, AgentState } from '../types';

interface AgentVisualizerProps {
  currentState: AgentState;
}

const steps = [
  { role: AgentRole.ROUTER, label: 'Router', icon: '⚡', desc: 'Intent Classification' },
  { role: AgentRole.HUNTER, label: 'Hunter', icon: '🔍', desc: 'URL Discovery' },
  { role: AgentRole.SCRAPER, label: 'Scraper', icon: '🕷️', desc: 'Data Extraction' },
  { role: AgentRole.ANALYST, label: 'Analyst', icon: '🧠', desc: 'SWOT Analysis' },
  { role: AgentRole.REPORTER, label: 'Reporter', icon: '📝', desc: 'Report Gen' },
];

const AgentVisualizer: React.FC<AgentVisualizerProps> = ({ currentState }) => {
  // Determine current step index
  const currentStepIndex = steps.findIndex(s => s.role === currentState.currentAgent);
  const isFinished = currentState.status === 'completed';
  
  return (
    <div className="w-full py-4 md:py-8 px-2 md:px-4">
      {/* Horizontal Scroll Container for Mobile */}
      <div className="overflow-x-auto pb-4">
          <div className="flex items-center justify-between relative min-w-[600px] max-w-5xl mx-auto px-4">
            {/* Connecting Line */}
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-sentinel-border -z-10 transform -translate-y-1/2"></div>
            
            {steps.map((step, index) => {
              let status = 'pending';
              if (isFinished || index < currentStepIndex) status = 'completed';
              else if (index === currentStepIndex && currentState.status === 'running') status = 'active';
              else if (index === currentStepIndex && currentState.status === 'failed') status = 'failed';

              return (
                <div key={step.role} className="flex flex-col items-center bg-sentinel-bg px-2 z-10">
                  <div className={`
                    w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border-2 transition-all duration-500
                    ${status === 'completed' ? 'bg-sentinel-success border-sentinel-success text-white' : ''}
                    ${status === 'active' ? 'bg-sentinel-accent/20 border-sentinel-accent text-sentinel-accent shadow-[0_0_15px_rgba(59,130,246,0.5)] scale-110' : ''}
                    ${status === 'pending' ? 'bg-sentinel-card border-sentinel-border text-sentinel-muted' : ''}
                    ${status === 'failed' ? 'bg-sentinel-danger border-sentinel-danger text-white' : ''}
                  `}>
                    {status === 'completed' ? (
                      <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="text-lg md:text-xl">{step.icon}</span>
                    )}
                  </div>
                  <div className="mt-3 text-center">
                    <div className={`text-xs md:text-sm font-bold ${status === 'active' ? 'text-white' : 'text-sentinel-muted'}`}>
                      {step.label}
                    </div>
                    <div className="text-[9px] md:text-[10px] text-sentinel-muted/70 font-mono uppercase tracking-wider mt-1 whitespace-nowrap">
                      {step.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
      </div>
    </div>
  );
};

export default AgentVisualizer;
