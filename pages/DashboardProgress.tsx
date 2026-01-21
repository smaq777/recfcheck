
import React, { useState, useEffect } from 'react';
import { AppView, LogEntry } from '../types';

interface DashboardProgressProps {
  onNavigate: (view: AppView) => void;
}

const DashboardProgress: React.FC<DashboardProgressProps> = ({ onNavigate }) => {
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([
    { timestamp: new Date().toLocaleTimeString(), message: 'RefCheck Audit Kernel booting...', type: 'start' },
  ]);

  useEffect(() => {
    const logPool: LogEntry[] = [
      { timestamp: '', message: 'Establishing handshake with Neon DB secure enclave...', type: 'info' },
      { timestamp: '', message: 'GROBID instance warm-up. PDF text-layer extraction active.', type: 'info' },
      { timestamp: '', message: 'Bibliography mapped. Detected 32 candidate references.', type: 'success' },
      { timestamp: '', message: 'Initiating global registry sync with OpenAlex polite pool...', type: 'info' },
      { timestamp: '', message: 'Matching Batch A: 12 references verified. No issues.', type: 'success' },
      { timestamp: '', message: 'Flagging potential retracted citation in IEEE subset.', type: 'warning' },
      { timestamp: '', message: 'Gemini AI generating remediation vectors...', type: 'info' },
      { timestamp: '', message: 'Cross-referencing DOIs with publisher landing pages...', type: 'info' },
      { timestamp: '', message: 'Audit finalization. Compiling trust score...', type: 'success' }
    ];

    let logIndex = 0;
    const interval = setInterval(() => {
      setProgress(prev => {
        const jump = Math.floor(Math.random() * 8) + 1;
        const next = Math.min(100, prev + jump);
        
        if (next > (logIndex + 1) * 11 && logIndex < logPool.length) {
          setLogs(prevLogs => [{...logPool[logIndex], timestamp: new Date().toLocaleTimeString()}, ...prevLogs]);
          logIndex++;
        }

        if (next === 100) {
          clearInterval(interval);
          setTimeout(() => onNavigate(AppView.RESULTS), 1000);
        }
        return next;
      });
    }, 800);

    return () => clearInterval(interval);
  }, [onNavigate]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50 p-6">
      <div className="max-w-4xl w-full space-y-12">
        <div className="text-center space-y-4">
           <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/10">
              <span className="size-1.5 bg-primary rounded-full animate-ping"></span>
              Live Audit System
           </div>
           <h1 className="text-4xl font-black text-slate-900 tracking-tight">Securing your Metadata</h1>
           <p className="text-slate-500 font-medium">Please wait while we verify your references against global academic registries.</p>
        </div>

        <div className="bg-white rounded-[3rem] border border-border-light shadow-2xl p-12 relative overflow-hidden group">
           {/* Progress Ring or Bar */}
           <div className="relative z-10 space-y-10">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Process</span>
                   <p className="text-lg font-bold text-slate-900">{progress < 30 ? 'Ingesting Metadata' : progress < 70 ? 'Registry Lookup' : 'Audit Finalization'}</p>
                </div>
                <span className="text-6xl font-black text-primary tracking-tighter">{progress}%</span>
              </div>
              
              <div className="relative h-4 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                <div 
                  className="h-full bg-primary transition-all duration-700 ease-out relative"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[progress-stripe_1s_linear_infinite]" />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                 {['Parse', 'Verify', 'AI Audit', 'Report'].map((label, idx) => (
                   <div key={label} className={`flex flex-col items-center gap-2 ${progress >= (idx * 25) ? 'text-primary' : 'text-slate-300'}`}>
                      <div className={`size-2 rounded-full ${progress >= (idx * 25) ? 'bg-primary' : 'bg-slate-200'}`} />
                      <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
                   </div>
                 ))}
              </div>
           </div>
        </div>

        {/* Terminal/Log View */}
        <div className="bg-[#0b0c15] rounded-[2rem] border border-white/5 shadow-2xl overflow-hidden flex flex-col h-64 p-8 group">
          <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
             <div className="flex gap-1.5">
                <div className="size-2 rounded-full bg-red-500/50"></div>
                <div className="size-2 rounded-full bg-yellow-500/50"></div>
                <div className="size-2 rounded-full bg-green-500/50"></div>
             </div>
             <span className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">System Log • aud_v82.log</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
             {logs.map((log, i) => (
               <div key={i} className="flex gap-4 font-mono text-[11px] animate-fade-in-up">
                  <span className="text-slate-600 whitespace-nowrap">[{log.timestamp}]</span>
                  <span className={`${
                    log.type === 'warning' ? 'text-yellow-400' : 
                    log.type === 'success' ? 'text-emerald-400' : 
                    log.type === 'start' ? 'text-primary' : 'text-slate-400'
                  }`}>
                    {log.message}
                  </span>
               </div>
             ))}
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes progress-stripe {
          from { background-position: 0 0; }
          to { background-position: 1rem 0; }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.4s ease-out forwards;
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default DashboardProgress;
