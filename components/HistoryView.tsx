import React, { useState, useMemo } from 'react';
import { AgentState } from '../types';

interface HistoryViewProps {
  history: AgentState[];
  onViewReport: (report: AgentState) => void;
  onCompare: (reports: AgentState[]) => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ history, onViewReport, onCompare }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [sortOrder, setSortOrder] = useState('newest');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const uniqueTypes = useMemo(() => {
    const types = new Set(history.map(h => h.analysisType || 'General').filter(Boolean));
    return ['All', ...Array.from(types)];
  }, [history]);

  const filteredAndSortedHistory = useMemo(() => {
    return history
      .filter(item => {
        const matchesSearch = (item.targetCompany || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = typeFilter === 'All' || (item.analysisType || 'General') === typeFilter;
        return matchesSearch && matchesType;
      })
      .sort((a, b) => {
        const dateA = new Date(a.timestamp || 0).getTime();
        const dateB = new Date(b.timestamp || 0).getTime();
        
        if (sortOrder === 'newest') return dateB - dateA;
        if (sortOrder === 'oldest') return dateA - dateB;
        if (sortOrder === 'az') return (a.targetCompany || '').localeCompare(b.targetCompany || '');
        if (sortOrder === 'za') return (b.targetCompany || '').localeCompare(a.targetCompany || '');
        return 0;
      });
  }, [history, searchTerm, typeFilter, sortOrder]);

  const toggleSelection = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (selectedIds.includes(id)) {
          setSelectedIds(prev => prev.filter(i => i !== id));
      } else {
          if (selectedIds.length < 2) {
              setSelectedIds(prev => [...prev, id]);
          } else {
             // Optional: Replace the first one or alert? 
             // For now, simple logic: remove first, add new
             setSelectedIds(prev => [prev[1], id]);
          }
      }
  };

  const handleCompareClick = () => {
      if (selectedIds.length !== 2) return;
      const reportA = history.find(h => h.workflowId === selectedIds[0]);
      const reportB = history.find(h => h.workflowId === selectedIds[1]);
      if (reportA && reportB) {
          onCompare([reportA, reportB]);
      }
  };

  return (
    <div className="p-4 md:p-8 animate-fade-in pb-24 relative min-h-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white">Analysis History</h2>
          <p className="text-sentinel-muted mt-1 text-sm md:text-base">Archive of all competitive intelligence reports</p>
        </div>
        
        <div className="flex flex-col md:flex-row flex-wrap gap-3 w-full md:w-auto">
          {/* Search */}
          <div className="relative w-full md:w-auto">
            <input
              type="text"
              placeholder="Search company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-sentinel-card border border-sentinel-border rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-sentinel-accent w-full md:w-48 lg:w-64"
            />
            <svg className="w-4 h-4 text-sentinel-muted absolute right-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-sentinel-card border border-sentinel-border rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-sentinel-accent cursor-pointer w-full md:w-auto"
          >
            {uniqueTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="bg-sentinel-card border border-sentinel-border rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-sentinel-accent cursor-pointer w-full md:w-auto"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="az">Company (A-Z)</option>
            <option value="za">Company (Z-A)</option>
          </select>
        </div>
      </div>

      {filteredAndSortedHistory.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-sentinel-border rounded-xl">
          <div className="text-sentinel-muted text-lg">No reports found matching your criteria.</div>
          {history.length === 0 && (
            <p className="text-sentinel-muted text-sm mt-2">Run your first analysis on the Dashboard to see it here.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedHistory.map((item) => {
            const isSelected = selectedIds.includes(item.workflowId);
            return (
                <div 
                key={item.workflowId}
                onClick={() => onViewReport(item)}
                className={`group bg-sentinel-card border rounded-xl p-5 transition-all cursor-pointer relative overflow-hidden 
                    ${isSelected ? 'border-sentinel-accent ring-1 ring-sentinel-accent bg-sentinel-accent/5' : 'border-sentinel-border hover:border-sentinel-accent hover:shadow-lg hover:shadow-blue-900/20'}
                `}
                >
                {/* Selection Checkbox */}
                <div 
                    className="absolute top-4 right-4 z-10"
                    onClick={(e) => toggleSelection(e, item.workflowId)}
                >
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-sentinel-accent border-sentinel-accent' : 'bg-sentinel-bg border-sentinel-border group-hover:border-sentinel-muted'}`}>
                        {isSelected && <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                </div>

                <div className="mb-4 pr-8">
                    <div className="flex items-start justify-between">
                        <h3 className="text-lg font-bold text-white truncate">{item.targetCompany || 'Unknown Company'}</h3>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-sentinel-bg border border-sentinel-border text-sentinel-muted">
                            {item.analysisType || 'General'}
                        </span>
                        <span className="text-xs text-sentinel-muted">
                            {item.timestamp ? new Date(item.timestamp).toLocaleDateString() : 'Unknown Date'}
                        </span>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-sentinel-muted">Sources Found</span>
                        <span className="text-white font-mono">{item.discoveredUrls?.length || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-sentinel-muted">Analysis Status</span>
                        <span className={`font-mono ${item.status === 'completed' ? 'text-sentinel-success' : 'text-sentinel-warning'}`}>
                            {item.status.toUpperCase()}
                        </span>
                    </div>
                </div>
                </div>
            );
          })}
        </div>
      )}

      {/* Floating Compare Action Bar */}
      {selectedIds.length > 0 && (
          <div className="fixed bottom-6 left-0 md:left-72 right-0 flex justify-center z-40 pointer-events-none">
              <div className="bg-sentinel-card border border-sentinel-border shadow-2xl rounded-full px-6 py-3 flex items-center gap-4 pointer-events-auto animate-fade-in-up">
                  <div className="text-sm font-medium text-white">
                      <span className="text-sentinel-accent font-bold">{selectedIds.length}</span> selected
                  </div>
                  <div className="h-4 w-px bg-sentinel-border"></div>
                  {selectedIds.length === 2 ? (
                      <button 
                        onClick={handleCompareClick}
                        className="bg-white text-black px-4 py-1.5 rounded-full text-sm font-bold hover:scale-105 active:scale-95 transition-transform flex items-center gap-2"
                      >
                          <span>Compare Reports</span>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </button>
                  ) : (
                      <span className="text-xs text-sentinel-muted italic">Select 2 to compare</span>
                  )}
                  {selectedIds.length > 0 && (
                    <button 
                        onClick={() => setSelectedIds([])}
                        className="ml-2 text-sentinel-muted hover:text-white"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};

export default HistoryView;