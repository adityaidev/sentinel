
import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { AgentState } from '../types';
import { sendChatMessage } from '../services/geminiService';

const ShareButton: React.FC<{ shareHash?: string }> = ({ shareHash }) => {
  const [copied, setCopied] = useState(false);
  const disabled = !shareHash;
  const handle = async () => {
    if (!shareHash) return;
    const url = `${window.location.origin}/?r=${shareHash}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this link', url);
    }
  };
  return (
    <button
      onClick={handle}
      disabled={disabled}
      title={disabled ? 'Saving...' : 'Copy share link'}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
        disabled
          ? 'bg-sentinel-card border border-sentinel-border text-sentinel-muted/50 cursor-wait'
          : copied
            ? 'bg-sentinel-success/20 border border-sentinel-success text-sentinel-success'
            : 'bg-sentinel-card border border-sentinel-border text-sentinel-muted hover:text-white hover:border-sentinel-accent/50'
      }`}
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
      {disabled ? 'Saving...' : copied ? 'Link copied' : 'Share Report'}
    </button>
  );
};

interface ReportViewProps {
  state: AgentState;
  onGenerateSocial: () => void;
}

// Custom Radar Chart using SVG
const RadarChart = ({ scores }: { scores: any }) => {
  if (!scores) return null;
  
  const metrics = [
    { key: 'innovation', label: 'Innovation' },
    { key: 'market_share', label: 'Market Share' },
    { key: 'pricing_power', label: 'Pricing' },
    { key: 'brand_reputation', label: 'Brand' },
    { key: 'velocity', label: 'Velocity' }
  ];

  const size = 200;
  const center = size / 2;
  const radius = 70;
  const angleStep = (Math.PI * 2) / metrics.length;

  // Calculate polygon points
  const points = metrics.map((metric, i) => {
    const value = scores[metric.key] || 0;
    const normalizedValue = Math.min(Math.max(value, 0), 100) / 100;
    const r = normalizedValue * radius;
    const angle = i * angleStep - Math.PI / 2; // Start at top
    const x = center + r * Math.cos(angle);
    const y = center + r * Math.sin(angle);
    return `${x},${y}`;
  }).join(' ');

  // Calculate background web points
  const levels = [0.25, 0.5, 0.75, 1];
  
  return (
    <div className="relative flex flex-col items-center justify-center p-4">
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
        {metrics.map((_, i) => {
           const angle = i * angleStep - Math.PI / 2;
           const x = center + radius * Math.cos(angle);
           const y = center + radius * Math.sin(angle);
           return <line key={i} x1={center} y1={center} x2={x} y2={y} stroke="#262626" strokeWidth="1" />;
        })}

        {/* Data Polygon */}
        <polygon points={points} fill="rgba(59, 130, 246, 0.2)" stroke="#3b82f6" strokeWidth="2" className="drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
        
        {/* Data Points */}
        {metrics.map((metric, i) => {
            const value = scores[metric.key] || 0;
            const normalizedValue = Math.min(Math.max(value, 0), 100) / 100;
            const r = normalizedValue * radius;
            const angle = i * angleStep - Math.PI / 2;
            const x = center + r * Math.cos(angle);
            const y = center + r * Math.sin(angle);
            
            // Label positions (pushed out slightly)
            const labelR = radius + 20;
            const labelX = center + labelR * Math.cos(angle);
            const labelY = center + labelR * Math.sin(angle);

            return (
              <g key={i}>
                <circle cx={x} cy={y} r="3" fill="#3b82f6" className="animate-pulse" />
                <text 
                  x={labelX} 
                  y={labelY} 
                  textAnchor="middle" 
                  dominantBaseline="middle" 
                  fill="#a1a1aa" 
                  className="text-[10px] uppercase font-mono tracking-tighter"
                >
                  {metric.label}
                </text>
              </g>
            );
        })}
      </svg>
      <div className="mt-2 text-xs text-sentinel-muted font-mono uppercase tracking-widest">Strategic Dimensions</div>
    </div>
  );
};

const MetricCard = ({ label, value, color = "text-white" }: { label: string, value: number, color?: string }) => (
  <div className="bg-sentinel-card/40 border border-sentinel-border p-4 rounded-lg flex flex-col items-center justify-center relative overflow-hidden group">
    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
    <span className="text-[10px] text-sentinel-muted font-mono uppercase tracking-widest mb-1 z-10">{label}</span>
    <div className={`text-3xl font-bold ${color} z-10 font-mono`}>{value}</div>
    {/* Simple Progress Bar background */}
    <div className="absolute bottom-0 left-0 h-1 bg-sentinel-border w-full">
      <div className="h-full bg-current opacity-50" style={{ width: `${value}%`, color: color === 'text-sentinel-accent' ? '#3b82f6' : color === 'text-sentinel-success' ? '#10b981' : '#f59e0b' }}></div>
    </div>
  </div>
);

const SwotCard = ({ title, items, type }: { title: string, items: string[], type: 'strength' | 'weakness' | 'opportunity' | 'threat' }) => {
    const colors = {
        strength: 'border-sentinel-success/30 bg-sentinel-success/5 text-sentinel-success',
        weakness: 'border-sentinel-warning/30 bg-sentinel-warning/5 text-sentinel-warning',
        opportunity: 'border-sentinel-accent/30 bg-sentinel-accent/5 text-sentinel-accent',
        threat: 'border-sentinel-danger/30 bg-sentinel-danger/5 text-sentinel-danger'
    };
    
    return (
        <div className={`p-4 rounded-lg border ${colors[type]} h-full transition-all duration-300 hover:scale-[1.02] hover:bg-opacity-10`}>
            <h4 className={`text-sm font-bold uppercase tracking-wider mb-3 flex items-center gap-2 ${colors[type].split(' ').pop()}`}>
                {type === 'strength' && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
                {type === 'weakness' && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>}
                {type === 'opportunity' && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>}
                {type === 'threat' && <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
                {title}
            </h4>
            <ul className="space-y-2">
                {items.slice(0, 4).map((item, idx) => (
                    <li key={idx} className="text-xs text-sentinel-muted leading-relaxed pl-3 border-l border-white/10 relative">
                         {item}
                    </li>
                ))}
            </ul>
        </div>
    );
};

// --- CHAT INTERFACE COMPONENT ---
const ReportChat = ({ context, company }: { context: string; company: string }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([]);
  }, [context]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsThinking(true);
    try {
      const history = messages.map(m => ({ role: m.role, content: m.text }));
      const r = await sendChatMessage(userMsg, context, history);
      setMessages(prev => [...prev, { role: 'model', text: r.text || "I couldn't generate a response." }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'model', text: `Error: ${(e as Error).message}` }]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="bg-sentinel-card/30 border border-sentinel-border rounded-xl p-4 mb-8 backdrop-blur-sm animate-fade-in transition-all">
       <div className="flex items-center gap-2 mb-3 text-sentinel-muted">
         <svg className="w-4 h-4 text-sentinel-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
         <span className="text-xs font-mono uppercase tracking-widest">Analyst Intelligence (Context + Web)</span>
       </div>

       {/* Messages Area (Collapsible effectively by being empty initially) */}
       {messages.length > 0 && (
         <div className="max-h-[300px] overflow-y-auto space-y-3 mb-4 pr-2 custom-scrollbar">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                 <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                   m.role === 'user' 
                     ? 'bg-sentinel-accent/20 text-white border border-sentinel-accent/30' 
                     : 'bg-sentinel-card text-sentinel-muted border border-sentinel-border'
                 }`}>
                   {m.role === 'model' ? (
                     <ReactMarkdown components={{
                        ul: ({node, ...props}) => <ul className="list-disc pl-4 mt-1 space-y-1" {...props} />,
                        li: ({node, ...props}) => <li className="text-xs" {...props} />
                     }}>{m.text}</ReactMarkdown>
                   ) : m.text}
                 </div>
              </div>
            ))}
            {isThinking && (
              <div className="flex justify-start">
                 <div className="bg-sentinel-card border border-sentinel-border rounded-lg px-3 py-2 flex items-center gap-2">
                    <div className="w-2 h-2 bg-sentinel-muted rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-sentinel-muted rounded-full animate-bounce delay-75"></div>
                    <div className="w-2 h-2 bg-sentinel-muted rounded-full animate-bounce delay-150"></div>
                 </div>
              </div>
            )}
            <div ref={messagesEndRef} />
         </div>
       )}

       {/* Prompt Bar */}
       <div className="relative flex items-center">
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={`Ask about ${company}, competitors, or general market trends...`}
            className="w-full bg-[#050505] border border-sentinel-border rounded-lg pl-4 pr-12 py-2.5 text-sm text-white focus:outline-none focus:border-sentinel-accent/50 focus:ring-1 focus:ring-sentinel-accent/20 transition-all placeholder-sentinel-muted/50"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isThinking}
            className="absolute right-2 p-1.5 bg-sentinel-card hover:bg-sentinel-accent/20 rounded-md text-sentinel-muted hover:text-white transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </button>
       </div>
    </div>
  );
};


const ReportView: React.FC<ReportViewProps> = ({ state, onGenerateSocial }) => {
  const [copied, setCopied] = useState(false);
  const [socialCopied, setSocialCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'report'>('dashboard');
  const [isGeneratingSocial, setIsGeneratingSocial] = useState(false);

  // When social post is available, ensure tab stays open or we show a notification
  // We can just rely on the UI rendering the social post box below.

  if (!state.finalReport || state.finalReport.length < 10) {
      if (state.status === 'completed') {
          return (
              <div className="max-w-4xl mx-auto mt-8 animate-fade-in-up bg-sentinel-card border border-sentinel-border rounded-xl p-8 text-center">
                  <h3 className="text-xl font-bold text-white mb-2">Report Generation Issue</h3>
                  <p className="text-sentinel-muted">The report was generated but appears to be empty. Please try again.</p>
              </div>
          );
      }
      return null;
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(state.finalReport || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopySocial = () => {
      navigator.clipboard.writeText(state.socialPost || '');
      setSocialCopied(true);
      setTimeout(() => setSocialCopied(false), 2000);
  };

  const onSocialClick = async () => {
      if (state.socialPost) return;
      setIsGeneratingSocial(true);
      await onGenerateSocial();
      setIsGeneratingSocial(false);
  };

  const scores = state.swotAnalysis?.scores || {
      innovation: 0,
      market_share: 0,
      pricing_power: 0,
      brand_reputation: 0,
      velocity: 0
  };
  
  // Construct context for the chat agent
  const chatContext = `
  COMPANY: ${state.targetCompany}
  ANALYSIS TYPE: ${state.analysisType}
  RAW EXTRACTED DATA:
  ${state.extractedContent}
  
  GENERATED SWOT:
  ${JSON.stringify(state.swotAnalysis)}
  
  FINAL REPORT:
  ${state.finalReport}
  `;

  return (
    <div className="max-w-6xl mx-auto mt-6 animate-fade-in-up px-2 sm:px-4 pb-20">
       
       {/* Header */}
       <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
          <div>
              <div className="flex items-center gap-3 mb-2">
                 <div className="h-8 w-8 rounded bg-gradient-to-tr from-sentinel-accent to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                    {state.targetCompany.charAt(0).toUpperCase()}
                 </div>
                 <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">{state.targetCompany}</h1>
              </div>
              <div className="flex items-center gap-4 text-sm text-sentinel-muted font-mono">
                  <span>ID: {state.workflowId.slice(0, 8)}</span>
                  <span className="text-sentinel-border">|</span>
                  <span>{new Date().toLocaleDateString()}</span>
                  <span className="text-sentinel-border">|</span>
                  <span className="text-sentinel-accent">{state.analysisType || 'GENERAL_INTEL'}</span>
              </div>
          </div>
          <div className="flex gap-2 flex-wrap">
             <ShareButton shareHash={state.shareHash} />
             <button
               onClick={() => setActiveTab('dashboard')}
               className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'dashboard' ? 'bg-white text-black' : 'bg-sentinel-card border border-sentinel-border text-sentinel-muted hover:text-white'}`}
             >
                Visual Intelligence
             </button>
             <button
               onClick={() => setActiveTab('report')}
               className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'report' ? 'bg-white text-black' : 'bg-sentinel-card border border-sentinel-border text-sentinel-muted hover:text-white'}`}
             >
                Executive Report
             </button>
          </div>
       </div>

       {/* Chat / Prompt Bar */}
       <ReportChat context={chatContext} company={state.targetCompany} />

       {activeTab === 'dashboard' && (
         <div className="animate-fade-in space-y-6">
            
            {/* Top Row: Metrics & Radar */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Metric Cards */}
                <div className="grid grid-cols-2 gap-4 lg:col-span-1">
                    <MetricCard label="Market Share" value={scores.market_share} color="text-sentinel-accent" />
                    <MetricCard label="Brand Power" value={scores.brand_reputation} color="text-white" />
                    <MetricCard label="Innovation" value={scores.innovation} color="text-purple-400" />
                    <MetricCard label="Velocity" value={scores.velocity} color="text-sentinel-success" />
                </div>

                {/* Radar Chart */}
                <div className="lg:col-span-1 bg-sentinel-card border border-sentinel-border rounded-xl flex items-center justify-center relative min-h-[280px]">
                    <div className="absolute top-3 left-3 text-xs font-mono text-sentinel-muted uppercase">Strategic Balance</div>
                    <RadarChart scores={scores} />
                </div>

                {/* Key Insight / Summary Card */}
                <div className="lg:col-span-1 bg-gradient-to-br from-sentinel-card to-sentinel-bg border border-sentinel-border rounded-xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <svg className="w-24 h-24 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Analyst Verdict</h3>
                    <div className="text-2xl font-light text-white leading-relaxed mb-4">
                        {scores.market_share > 75 ? "Dominant Market Leader" : 
                         scores.innovation > 80 ? "High-Growth Disruptor" : 
                         scores.pricing_power < 40 ? "Cost-Competitor" : "Established Player"}
                    </div>
                    <p className="text-sm text-sentinel-muted leading-relaxed">
                        Based on {state.discoveredUrls.length} data points, {state.targetCompany} exhibits 
                        strong {scores.innovation > scores.brand_reputation ? 'product innovation' : 'brand equity'} but faces challenges in 
                        {scores.pricing_power < 50 ? ' maintaining pricing power' : ' scaling operations'}.
                    </p>
                </div>
            </div>

            {/* SWOT Grid */}
            <div>
                <h3 className="text-xs font-mono text-sentinel-muted uppercase tracking-widest mb-4 pl-1">SWOT Matrix</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[300px]">
                    <SwotCard title="Strengths" items={state.swotAnalysis?.strengths || []} type="strength" />
                    <SwotCard title="Weaknesses" items={state.swotAnalysis?.weaknesses || []} type="weakness" />
                    <SwotCard title="Opportunities" items={state.swotAnalysis?.opportunities || []} type="opportunity" />
                    <SwotCard title="Threats" items={state.swotAnalysis?.threats || []} type="threat" />
                </div>
            </div>
         </div>
       )}

       {activeTab === 'report' && (
           <div className="space-y-6">
                <div className="bg-sentinel-card border border-sentinel-border rounded-xl overflow-hidden shadow-2xl animate-fade-in">
                    <div className="bg-sentinel-bg p-4 border-b border-sentinel-border flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                            <div className="h-3 w-3 rounded-full bg-sentinel-success animate-pulse"></div>
                            <span className="text-xs sm:text-sm font-mono text-sentinel-muted uppercase">Confidential Document</span>
                        </div>
                        <div className="flex gap-2">
                             <button 
                                onClick={onSocialClick}
                                disabled={isGeneratingSocial}
                                className={`text-xs px-3 py-1.5 rounded transition-colors flex items-center gap-2 border border-sentinel-border ${state.socialPost ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' : 'bg-sentinel-card hover:bg-sentinel-border text-white'}`}
                            >
                                {isGeneratingSocial ? (
                                    <>
                                       <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                                       <span>Drafting...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                        <span>Draft LinkedIn Post</span>
                                    </>
                                )}
                            </button>

                            <button 
                                onClick={handleCopy}
                                className="text-xs bg-sentinel-card hover:bg-sentinel-border border border-sentinel-border text-white px-3 py-1.5 rounded transition-colors flex items-center gap-2"
                            >
                                {copied ? <span className="text-green-400">Copied</span> : <span>Copy Markdown</span>}
                            </button>
                        </div>
                    </div>
                    
                    <div className="p-3 sm:p-6 md:p-10 bg-sentinel-card/50">
                        <div className="markdown-body">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {state.finalReport}
                            </ReactMarkdown>
                        </div>
                    </div>
                </div>

                {/* Social Post Preview (Visible if generated) */}
                {state.socialPost && (
                    <div className="animate-fade-in-up bg-[#000000] border border-sentinel-border rounded-xl p-6 relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-blue-400 opacity-70"></div>
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <span className="text-blue-400 text-lg">in</span>
                                <span>Draft Post</span>
                            </h3>
                            <button 
                                onClick={handleCopySocial}
                                className="text-xs text-sentinel-muted hover:text-white flex items-center gap-1"
                            >
                                {socialCopied ? <span className="text-green-400">Copied</span> : 'Copy Text'}
                            </button>
                        </div>
                        <textarea 
                            readOnly 
                            value={state.socialPost}
                            className="w-full h-48 bg-transparent border-none focus:ring-0 text-sm text-gray-300 resize-none leading-relaxed custom-scrollbar"
                        />
                    </div>
                )}
           </div>
       )}
    </div>
  );
};

export default ReportView;
