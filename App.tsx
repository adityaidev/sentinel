
import React, { useState, useCallback, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import AgentVisualizer from './components/AgentVisualizer';
import ReportView from './components/ReportView';
import HistoryView from './components/HistoryView';
import ComparisonView from './components/ComparisonView';
import { WorkflowStats, AgentState, LogEntry, AgentRole } from './types';
import { runRouterAgent, runHunterAgent, runScraperAgent, runAnalystAgent, runReporterAgent, runSocialAgent } from './services/geminiService';

const INITIAL_STATS: WorkflowStats = {
  totalWorkflows: 0,
  successRate: 100,
  avgExecutionTimeMs: 0,
  totalTokens: 0,
  totalCost: 0,
  lastExecutionTimeMs: 0
};

const INITIAL_STATE: AgentState = {
  workflowId: '',
  status: 'idle',
  currentAgent: null,
  targetCompany: '',
  analysisType: '',
  discoveredUrls: [],
  extractedContent: '',
  swotAnalysis: null,
  finalReport: null,
  socialPost: null,
  logs: []
};

// --- Typewriter Component ---
const Typewriter = ({ text, delay = 40, startDelay = 0, onComplete, className }: { text: string, delay?: number, startDelay?: number, onComplete?: () => void, className?: string }) => {
  const [currentText, setCurrentText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const startTimeout = setTimeout(() => {
      setStarted(true);
    }, startDelay);
    return () => clearTimeout(startTimeout);
  }, [startDelay]);

  useEffect(() => {
    if (!started) return;

    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setCurrentText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, delay);
      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, delay, text, onComplete, started]);

  return <span className={className}>{currentText}{currentIndex < text.length && started ? <span className="animate-cursor-blink ml-0.5 border-r-2 border-sentinel-accent h-[1em] inline-block align-middle"></span> : null}</span>;
};

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [stats, setStats] = useState<WorkflowStats>(INITIAL_STATS);
  const [state, setState] = useState<AgentState>(INITIAL_STATE);
  const [history, setHistory] = useState<AgentState[]>([]);
  const [query, setQuery] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile sidebar state
  
  // Comparison State
  const [comparisonReports, setComparisonReports] = useState<AgentState[] | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Typing state state
  const [titleTyped, setTitleTyped] = useState(false);
  
  // Persist stats and history
  useEffect(() => {
    const savedStats = localStorage.getItem('sentinel_stats');
    if (savedStats) setStats(JSON.parse(savedStats));
    
    const savedHistory = localStorage.getItem('sentinel_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
  }, []);

  useEffect(() => {
    localStorage.setItem('sentinel_stats', JSON.stringify(stats));
  }, [stats]);

  useEffect(() => {
    localStorage.setItem('sentinel_history', JSON.stringify(history));
  }, [history]);

  const addLog = useCallback((log: LogEntry) => {
    setState(prev => ({ ...prev, logs: [log, ...prev.logs] }));
    setStats(prev => ({
      ...prev,
      totalTokens: prev.totalTokens + (log.tokenUsage || 0),
      totalCost: prev.totalCost + (log.cost || 0)
    }));
  }, []);

  const handleViewReport = (reportState: AgentState) => {
    setState(reportState);
    setCurrentView('dashboard');
    setIsSidebarOpen(false); // Close sidebar on mobile selection
  };
  
  const handleCompare = (reports: AgentState[]) => {
      setComparisonReports(reports);
      setCurrentView('compare');
  };

  // Function to reset dashboard to input state
  const handleReset = () => {
    setState(INITIAL_STATE);
    setQuery('');
    setIsPaused(false);
    setCurrentView('dashboard');
    // Reset typing state if navigating back to empty dashboard
    setTitleTyped(false);
  };

  // Smart navigation handler
  const handleNavigation = (view: string) => {
    if (view === 'dashboard') {
      // If clicking dashboard while viewing a report, verify intent or just reset?
      // UX Decision: If user explicitly clicks Dashboard in sidebar, they likely want the home screen.
      if (state.status !== 'idle' || state.finalReport) {
        handleReset();
      }
    }
    setCurrentView(view);
    setIsSidebarOpen(false);
  };

  const handleGenerateSocial = async () => {
     if (!state.finalReport || !state.targetCompany) return;
     
     // Only generate if not already generated to save tokens/cost
     if (state.socialPost) return;

     try {
         // Create a temporary log for "Thinking"
         const thinkingLog: LogEntry = {
            timestamp: new Date().toISOString(),
            agent: AgentRole.SOCIAL,
            message: "Drafting social content...",
            type: 'info'
         };
         // Just visual feedback, not adding to main log until done to prevent spam if user clicks multiple times
         // But we should show activity.
         
         const result = await runSocialAgent(state.finalReport, state.targetCompany);
         addLog(result.log);
         
         setState(prev => ({ ...prev, socialPost: result.post }));
         
         // Update history to include the new social post
         setHistory(prev => prev.map(h => h.workflowId === state.workflowId ? { ...h, socialPost: result.post } : h));

     } catch (e) {
         console.error("Social generation failed", e);
         addLog({
             timestamp: new Date().toISOString(),
             agent: AgentRole.SOCIAL,
             message: "Failed to generate social post",
             type: 'error'
         });
     }
  };

  const handleAnalyze = async () => {
    if (!query.trim()) return;
    
    const newWorkflowId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    // Reset state for new run
    setState(prev => ({ 
        ...INITIAL_STATE, 
        workflowId: newWorkflowId, 
        status: 'running',
        timestamp: timestamp,
        logs: prev.logs 
    }));
    setStats(prev => ({ ...prev, totalWorkflows: prev.totalWorkflows + 1 }));

    const startTime = performance.now();

    try {
      // --- Step 1: Router ---
      setState(prev => ({ ...prev, currentAgent: AgentRole.ROUTER }));
      const routerResult = await runRouterAgent(query);
      addLog(routerResult.log);
      setState(prev => ({ 
        ...prev, 
        targetCompany: routerResult.target_company,
        analysisType: routerResult.analysis_type
      }));

      // --- Step 2: Hunter ---
      setState(prev => ({ ...prev, currentAgent: AgentRole.HUNTER }));
      const hunterResult = await runHunterAgent(routerResult.target_company, routerResult.search_queries);
      addLog(hunterResult.log);
      setState(prev => ({ ...prev, discoveredUrls: hunterResult.discoveredUrls }));

      // --- Step 3: Scraper ---
      setState(prev => ({ ...prev, currentAgent: AgentRole.SCRAPER }));
      const scraperResult = await runScraperAgent(hunterResult.discoveredUrls);
      addLog(scraperResult.log);
      setState(prev => ({ ...prev, extractedContent: scraperResult.extractedContent }));

      // --- Step 4: Analyst ---
      setState(prev => ({ ...prev, currentAgent: AgentRole.ANALYST }));
      const analystResult = await runAnalystAgent(scraperResult.extractedContent);
      addLog(analystResult.log);
      setState(prev => ({ ...prev, swotAnalysis: analystResult.swot }));

      // --- Step 5: Reporter ---
      setState(prev => ({ ...prev, currentAgent: AgentRole.REPORTER }));
      const reporterResult = await runReporterAgent(analystResult.swot, scraperResult.extractedContent, routerResult.target_company);
      addLog(reporterResult.log);
      
      const completedState: AgentState = {
        ...state,
        targetCompany: routerResult.target_company, // Ensure these are set in the final object
        analysisType: routerResult.analysis_type,
        discoveredUrls: hunterResult.discoveredUrls,
        extractedContent: scraperResult.extractedContent,
        swotAnalysis: analystResult.swot,
        finalReport: reporterResult.report,
        status: 'completed',
        currentAgent: null,
        timestamp: timestamp,
        workflowId: newWorkflowId,
        logs: [reporterResult.log, ...state.logs] // Include latest log
      };

      setState(completedState);
      
      // Add to history
      setHistory(prev => [completedState, ...prev]);

      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      setStats(prev => ({
        ...prev,
        avgExecutionTimeMs: (prev.avgExecutionTimeMs * (prev.totalWorkflows - 1) + executionTime) / prev.totalWorkflows,
        lastExecutionTimeMs: executionTime
      }));

    } catch (error) {
      console.error(error);
      setState(prev => ({ ...prev, status: 'failed', currentAgent: null }));
      addLog({
        timestamp: new Date().toISOString(),
        agent: AgentRole.ROUTER, // Fallback
        message: `Workflow failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      });
    }
  };

  return (
    <div className="flex min-h-screen bg-sentinel-bg font-sans text-sentinel-text selection:bg-sentinel-accent/30 selection:text-white overflow-x-hidden">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-20 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Sidebar 
        stats={stats} 
        logs={state.logs} 
        currentView={currentView}
        setCurrentView={handleNavigation}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      {/* Main Content - Adjusted margins for responsive layout */}
      <main className="flex-1 flex flex-col relative transition-all duration-300 ml-0 md:ml-72 w-full">
        
        {/* Top Bar */}
        <header className="h-14 border-b border-sentinel-border flex items-center justify-between px-4 md:px-8 bg-sentinel-bg/90 backdrop-blur sticky top-0 z-20">
          <div className="flex items-center gap-4">
             {/* Mobile Menu Button */}
             <button 
               className="md:hidden text-sentinel-muted hover:text-white p-1"
               onClick={() => setIsSidebarOpen(true)}
             >
               <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
               </svg>
             </button>

             <span className="text-[10px] font-mono text-sentinel-muted/60 uppercase tracking-widest hidden sm:inline-block">
                SESSION: <span className="text-sentinel-text">{state.workflowId ? state.workflowId.slice(0, 8) : 'READY'}</span>
             </span>
             {state.status === 'running' && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-[2px] text-[9px] font-bold tracking-wider bg-blue-500/10 text-blue-400 animate-pulse border border-blue-500/20">
                  LIVE
                </span>
             )}
          </div>
          <div className="flex items-center gap-4 md:gap-6">
             {state.status === 'running' && (
                 <button 
                   onClick={() => setIsPaused(!isPaused)}
                   className="px-3 py-1 border border-sentinel-border rounded hover:bg-sentinel-card transition text-xs text-sentinel-muted hover:text-white"
                 >
                   {isPaused ? "RESUME" : "PAUSE"}
                 </button>
             )}
             
             <div className="flex items-center gap-3 pl-4 md:pl-6 border-l border-sentinel-border h-8">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-medium text-white leading-tight">Admin</div>
                  <div className="text-[9px] text-sentinel-muted uppercase tracking-wide leading-tight">Operator</div>
                </div>
                <div className="h-7 w-7 rounded bg-sentinel-card border border-sentinel-border flex items-center justify-center text-sentinel-muted">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                </div>
             </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto relative w-full">
           
           {currentView === 'dashboard' && (
             <div className={`p-4 md:p-8 flex flex-col ${state.status === 'idle' && !state.finalReport ? 'items-center justify-center min-h-[calc(100vh-3.5rem)]' : ''}`}>
                 {/* Input Section - Center if idle, shrink if results */}
                 <div className={`transition-all duration-700 ease-in-out w-full max-w-2xl ${state.status === 'idle' && !state.finalReport ? 'scale-100' : 'hidden'}`}>
                    
                    {(state.status === 'idle' && !state.finalReport) && (
                      <div className="text-center mb-8 md:mb-10 animate-fade-in-up px-4">
                          <div className="flex justify-center mb-6 relative">
                            {/* Subtle glow behind logo */}
                            <div className="absolute inset-0 bg-sentinel-accent/20 blur-[60px] rounded-full transform scale-150"></div>
                            {/* Logo with 45 Degree Sway Animation */}
                            <svg className="w-16 h-16 md:w-20 md:h-20 text-white relative z-10 drop-shadow-2xl animate-sway-45" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="1.5" fill="none" className="opacity-80"/>
                              <path d="M 32 10 C 42 10 48 18 48 24 C 48 30 42 32 32 32 C 22 32 16 34 16 40 C 16 46 22 54 32 54" 
                                    stroke="currentColor" 
                                    strokeWidth="2" 
                                    strokeLinecap="round" 
                                    strokeLinejoin="round" 
                                    fill="none"
                                    className="animate-[pulse_4s_ease-in-out_infinite]"/>
                              <circle cx="32" cy="32" r="2.5" fill="currentColor" className="animate-pulse"/>
                              <line x1="32" y1="32" x2="55" y2="20" stroke="currentColor" strokeWidth="1" strokeLinecap="round" className="opacity-40"/>
                            </svg>
                          </div>
                          
                          {/* Typewriter Title */}
                          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight h-10">
                            <Typewriter text="Welcome to Sentinel" onComplete={() => setTitleTyped(true)} />
                          </h1>
                          
                          {/* Typewriter Subtitle - Starts after title finishes */}
                          <p className="text-sentinel-muted text-sm max-w-xs mx-auto md:max-w-none h-6">
                            {titleTyped && <Typewriter text="Enter a competitor name to launch autonomous agents." delay={20} />}
                          </p>
                      </div>
                    )}
                    
                    <div className="relative group z-10">
                      {/* Input Glow */}
                      <div className="absolute -inset-[1px] bg-gradient-to-r from-sentinel-accent/50 via-purple-500/50 to-sentinel-accent/50 rounded-xl blur opacity-0 group-hover:opacity-40 group-focus-within:opacity-100 transition duration-500"></div>
                      
                      <div className="relative flex flex-col sm:flex-row items-stretch sm:items-center bg-[#050505] rounded-xl border border-sentinel-border group-hover:border-sentinel-border/80 transition-colors overflow-hidden shadow-2xl">
                          <div className="flex-1 pl-4 py-2">
                            <textarea 
                                ref={textareaRef}
                                id="analysis-input"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAnalyze(); } }}
                                placeholder="e.g., Analyze OpenAI's latest pricing changes..." 
                                className="w-full bg-transparent border-none text-white placeholder-sentinel-muted/40 text-base md:text-lg focus:outline-none focus:ring-0 resize-none leading-relaxed pt-2"
                                disabled={state.status === 'running'}
                                rows={1}
                                style={{ minHeight: '48px' }}
                            />
                          </div>
                          <div className="p-2 sm:pr-2 sm:py-2 w-full sm:w-auto">
                            <button 
                                onClick={handleAnalyze}
                                disabled={state.status === 'running'}
                                className="w-full sm:w-auto bg-white text-black hover:bg-gray-200 px-6 py-2.5 rounded-lg font-bold text-sm tracking-wide transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 h-10 sm:h-full"
                            >
                                {state.status === 'running' ? (
                                  <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span className="sm:hidden">PROCESSING</span>
                                    <span className="hidden sm:inline">PROCESSING</span>
                                  </>
                                ) : (
                                  <>
                                    ANALYZE
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                  </>
                                )}
                            </button>
                          </div>
                      </div>
                    </div>
                    
                    {/* Quick Analysis Buttons */}
                    {(state.status === 'idle' && !state.finalReport) && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 animate-fade-in-up">
                            <button 
                                onClick={() => { setQuery("Analyze pricing strategy for "); textareaRef.current?.focus(); }}
                                className="flex flex-col items-start p-3.5 bg-sentinel-card/50 border border-sentinel-border rounded-xl hover:bg-sentinel-card hover:border-sentinel-border/80 transition-all duration-200 group text-left"
                            >
                                <div className="font-semibold text-sm text-gray-200 group-hover:text-white mb-0.5">Analyze Pricing</div>
                                <div className="text-[11px] text-sentinel-muted">Track price changes and plan structures</div>
                            </button>

                            <button 
                                onClick={() => { setQuery("Analyze new features for "); textareaRef.current?.focus(); }}
                                className="flex flex-col items-start p-3.5 bg-sentinel-card/50 border border-sentinel-border rounded-xl hover:bg-sentinel-card hover:border-sentinel-border/80 transition-all duration-200 group text-left"
                            >
                                <div className="font-semibold text-sm text-gray-200 group-hover:text-white mb-0.5">New Features</div>
                                <div className="text-[11px] text-sentinel-muted">Discover product updates and capabilities</div>
                            </button>

                            <button 
                                onClick={() => { setQuery("Scan for announcements from "); textareaRef.current?.focus(); }}
                                className="flex flex-col items-start p-3.5 bg-sentinel-card/50 border border-sentinel-border rounded-xl hover:bg-sentinel-card hover:border-sentinel-border/80 transition-all duration-200 group text-left"
                            >
                                <div className="font-semibold text-sm text-gray-200 group-hover:text-white mb-0.5">Scan for Announcements</div>
                                <div className="text-[11px] text-sentinel-muted">Monitor press releases and news</div>
                            </button>
                        </div>
                    )}
                 </div>

                 {/* Workflow Visualization & Results */}
                 {(state.status !== 'idle' || state.finalReport) && (
                    <div className="w-full mt-8 space-y-8 pb-20">
                        
                        {/* Back Navigation / Controls */}
                        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between animate-fade-in-up">
                            <button 
                              onClick={handleReset}
                              className="group flex items-center gap-3 text-sentinel-muted hover:text-white transition-colors"
                            >
                              <div className="w-8 h-8 rounded-full bg-sentinel-card border border-sentinel-border flex items-center justify-center group-hover:border-sentinel-accent transition-colors">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                              </div>
                              <div className="flex flex-col items-start">
                                <span className="text-sm font-bold tracking-wide">NEW ANALYSIS</span>
                                <span className="text-[10px] text-sentinel-muted/70 uppercase">Return to dashboard</span>
                              </div>
                            </button>
                        </div>

                        <AgentVisualizer currentState={state} />
                        
                        {/* Interim Results (Hunter) */}
                        {state.discoveredUrls.length > 0 && state.status !== 'completed' && (
                            <div className="max-w-4xl mx-auto animate-fade-in-up px-2">
                                <h3 className="text-xs font-mono text-sentinel-muted mb-3 uppercase tracking-wider">Hunter Discovered Sources</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {state.discoveredUrls.slice(0, 4).map((u, i) => (
                                        <div key={i} className="bg-sentinel-card border border-sentinel-border p-3 rounded hover:border-sentinel-accent/50 transition-colors">
                                            <div className="text-blue-400 text-[10px] mb-1 truncate font-mono">{u.url}</div>
                                            <div className="font-medium text-sm line-clamp-1 text-gray-200">{u.title}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Final Report */}
                        <ReportView state={state} onGenerateSocial={handleGenerateSocial} />
                    </div>
                 )}
             </div>
           )}

           {currentView === 'history' && (
             <HistoryView 
                history={history} 
                onViewReport={handleViewReport} 
                onCompare={handleCompare}
             />
           )}

           {currentView === 'compare' && comparisonReports && comparisonReports.length === 2 && (
             <ComparisonView 
                reportA={comparisonReports[0]}
                reportB={comparisonReports[1]}
                onBack={() => setCurrentView('history')}
             />
           )}
           
        </div>
      </main>
    </div>
  );
}
