
import React from 'react';
import { WorkflowStats, LogEntry } from '../types';

interface SidebarProps {
  stats: WorkflowStats;
  logs: LogEntry[];
  currentView: string;
  setCurrentView: (view: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ stats, logs, currentView, setCurrentView, isOpen, onClose }) => {
  return (
    <div 
      className={`
        w-72 bg-sentinel-bg border-r border-sentinel-border flex flex-col h-screen 
        fixed left-0 top-0 overflow-hidden z-30 
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}
    >
      
      {/* Mobile Header with Close Button */}
      <div className="md:hidden flex items-center justify-end p-4 pb-0">
         <button onClick={onClose} className="text-sentinel-muted hover:text-white">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
         </button>
      </div>

      {/* Navigation - Moved to top since Logo is gone */}
      <div className="p-4 pt-6 space-y-1">
        <button 
          onClick={() => setCurrentView('dashboard')}
          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
            currentView === 'dashboard' 
              ? 'bg-sentinel-card text-white border border-sentinel-border shadow-sm' 
              : 'text-sentinel-muted hover:text-white hover:bg-sentinel-card/50'
          }`}
        >
          <svg className={`w-5 h-5 transition-colors ${currentView === 'dashboard' ? 'text-sentinel-accent' : 'text-sentinel-muted group-hover:text-white'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          <span className="font-medium text-sm">Dashboard</span>
        </button>
        
        <button 
          onClick={() => setCurrentView('history')}
          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
            currentView === 'history' 
              ? 'bg-sentinel-card text-white border border-sentinel-border shadow-sm' 
              : 'text-sentinel-muted hover:text-white hover:bg-sentinel-card/50'
          }`}
        >
          <svg className={`w-5 h-5 transition-colors ${currentView === 'history' ? 'text-sentinel-accent' : 'text-sentinel-muted group-hover:text-white'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium text-sm">History</span>
        </button>
      </div>

      <div className="my-2 border-b border-sentinel-border mx-4"></div>

      {/* Metrics */}
      <div className="p-4">
        <h2 className="text-[11px] font-mono text-sentinel-muted/70 uppercase tracking-widest mb-4 pl-1">
            Observability
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-sentinel-card p-3 rounded-lg border border-sentinel-border">
            <div className="text-sentinel-muted text-[10px] uppercase mb-1">Total Cost</div>
            <div className="text-white font-mono font-bold text-sm">${stats.totalCost.toFixed(4)}</div>
          </div>
          <div className="bg-sentinel-card p-3 rounded-lg border border-sentinel-border">
            <div className="text-sentinel-muted text-[10px] uppercase mb-1">Avg Latency</div>
            <div className="text-white font-mono font-bold text-sm">{(stats.avgExecutionTimeMs / 1000).toFixed(1)}s</div>
          </div>
          <div className="bg-sentinel-card p-3 rounded-lg border border-sentinel-border">
            <div className="text-sentinel-muted text-[10px] uppercase mb-1">Workflows</div>
            <div className="text-white font-mono font-bold text-sm">{stats.totalWorkflows}</div>
          </div>
          <div className="bg-sentinel-card p-3 rounded-lg border border-sentinel-border">
            <div className="text-sentinel-muted text-[10px] uppercase mb-1">Tokens</div>
            <div className="text-white font-mono font-bold text-sm">{(stats.totalTokens / 1000).toFixed(1)}k</div>
          </div>
        </div>
      </div>

      <div className="my-2 border-b border-sentinel-border mx-4"></div>

      {/* Live Logs */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <h2 className="text-[11px] font-mono text-sentinel-muted/70 uppercase tracking-widest mb-2 pl-1">Activity Log</h2>
        {logs.length === 0 && <div className="text-sentinel-muted text-xs italic pl-1">System ready.</div>}
        {logs.map((log, idx) => (
          <div key={idx} className="text-xs font-mono border-l-2 border-sentinel-border pl-3 py-1 animate-pulse-once hover:border-sentinel-accent transition-colors">
            <div className="flex justify-between text-sentinel-muted mb-1">
                <span>{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                <span className={`px-1 rounded text-[9px] font-bold tracking-wide ${
                    log.agent === 'ROUTER' ? 'text-purple-400' :
                    log.agent === 'HUNTER' ? 'text-blue-400' :
                    log.agent === 'SCRAPER' ? 'text-yellow-400' :
                    log.agent === 'ANALYST' ? 'text-green-400' :
                    'text-pink-400'
                }`}>{log.agent}</span>
            </div>
            <div className="text-gray-300 leading-relaxed">{log.message}</div>
            {log.cost && <div className="text-sentinel-muted mt-1 opacity-40 text-[10px]">${log.cost.toFixed(5)}</div>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
