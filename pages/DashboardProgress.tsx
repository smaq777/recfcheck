
import React, { useState, useEffect } from 'react';
import { AppView, LogEntry } from '../types';

interface DashboardProgressProps {
  onNavigate: (view: AppView) => void;
}

interface Step {
  id: number;
  label: string;
  desc: string;
  range: [number, number];
  substeps: string[];
}

const steps: Step[] = [
  { 
    id: 1, label: 'Parsing Document', desc: 'Extracting citations from PDF...', range: [0, 15], 
    substeps: ['Locating citation markers', 'Extracting BibTeX keys', 'Parsing reference strings']
  },
  { 
    id: 2, label: 'Normalizing Metadata', desc: 'Standardizing names and venues...', range: [16, 25], 
    substeps: ['Cleaning author strings', 'Detecting publication years', 'Resolving DOI prefixes']
  },
  { 
    id: 3, label: 'Registry Matching', desc: 'Querying OpenAlex & Crossref...', range: [26, 70], 
    substeps: ['Matching by DOI', 'Title fuzzy-matching', 'Author overlap validation']
  },
  { 
    id: 4, label: 'Duplicate Detection', desc: 'Clustering similar entries...', range: [71, 85], 
    substeps: ['Title similarity scan', 'DOI collision detection', 'Canonical grouping']
  },
  { 
    id: 5, label: 'Issue Analysis', desc: 'Checking retraction status...', range: [86, 95], 
    substeps: ['Retraction Watch scan', 'Venue mismatch check', 'Severity scoring']
  },
  { 
    id: 6, label: 'Generating Report', desc: 'Finalizing audit findings...', range: [96, 100], 
    substeps: ['Categorizing results', 'Building suggestion engine', 'Synchronizing to DB']
  }
];

const DashboardProgress: React.FC<DashboardProgressProps> = ({ onNavigate }) => {
  const [progress, setProgress] = useState(0);
  const [activeStepId, setActiveStepId] = useState(1);
  const [currentStepName, setCurrentStepName] = useState('Parsing Document');
  const [logs, setLogs] = useState<LogEntry[]>([
    { timestamp: new Date().toLocaleTimeString(), message: 'RefCheck Audit Kernel booting...', type: 'start' },
  ]);

  useEffect(() => {
    const jobId = localStorage.getItem('current_job_id');
    if (!jobId) {
      console.error('No job ID found');
      return;
    }

    // Connect to SSE endpoint for real-time progress
    const eventSource = new EventSource(`/api/progress?jobId=${jobId}`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      setProgress(data.progress);
      setCurrentStepName(data.currentStep);
      
      // Find matching step by progress range
      const step = steps.find(s => data.progress >= s.range[0] && data.progress <= s.range[1]) || steps[steps.length - 1];
      
      if (step.id !== activeStepId) {
        setActiveStepId(step.id);
        setLogs(prevLogs => [
          { timestamp: new Date().toLocaleTimeString(), message: `Switching to ${step.label}`, type: 'info' },
          ...prevLogs.slice(0, 20) // Keep only last 20 logs
        ]);
      }
      
      // Add log for reference processing
      if (data.processedReferences) {
        setLogs(prevLogs => [
          { timestamp: new Date().toLocaleTimeString(), message: `Processing reference ${data.processedReferences}/${data.totalReferences}`, type: 'info' },
          ...prevLogs.slice(0, 20)
        ]);
      }

      // Navigate to results when completed
      if (data.status === 'completed' && data.progress >= 100) {
        setTimeout(() => {
          eventSource.close();
          onNavigate(AppView.RESULTS);
        }, 1200);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      eventSource.close();
      
      // Fallback: Poll for status
      const pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`/api/results?jobId=${jobId}`);
          const data = await response.json();
          
          if (data.status === 'completed') {
            clearInterval(pollInterval);
            onNavigate(AppView.RESULTS);
          }
        } catch (err) {
          console.error('Polling error:', err);
        }
      }, 1000);
      
      return () => clearInterval(pollInterval);
    };

    return () => {
      eventSource.close();
    };
  }, [onNavigate, activeStepId]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/50 p-6">
      <div className="max-w-4xl w-full space-y-12 animate-fade-in">
        <div className="text-center space-y-4">
           <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/5 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/10">
              <span className="size-1.5 bg-primary rounded-full animate-ping"></span>
              Live Audit Engine
           </div>
           <h1 className="text-4xl font-black text-slate-900 tracking-tight">🔍 Analyzing Your Bibliography</h1>
           <p className="text-slate-500 font-medium">Please wait while we cross-reference your source with academic registries.</p>
        </div>

        <div className="bg-white rounded-[3rem] border border-border-light shadow-2xl p-12 relative overflow-hidden">
           <div className="relative z-10 space-y-10">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Step {activeStepId}/{steps.length}</span>
                   <p className="text-2xl font-black text-slate-900">{currentStepName}</p>
                   <p className="text-sm text-slate-500 font-medium">{steps[activeStepId-1]?.desc || 'Processing...'}</p>
                </div>
                <div className="text-right">
                  <span className="text-6xl font-black text-primary tracking-tighter">{Math.floor(progress)}%</span>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">~{Math.round((100 - progress) * 0.4)}s remaining</p>
                </div>
              </div>
              <div className="relative h-4 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                <div className="h-full bg-primary transition-all duration-300 relative" style={{ width: `${progress}%` }}>
                  <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:1rem_1rem] animate-[progress-stripe_1s_linear_infinite]" />
                </div>
              </div>
           </div>
        </div>

        <div className="bg-[#0b0c15] rounded-[2rem] border border-white/5 shadow-2xl overflow-hidden flex flex-col h-64 p-8">
          <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
             <div className="flex gap-1.5">
                <div className="size-2 rounded-full bg-red-500/50"></div>
                <div className="size-2 rounded-full bg-yellow-500/50"></div>
                <div className="size-2 rounded-full bg-green-500/50"></div>
             </div>
             <span className="text-[9px] font-mono text-slate-600 uppercase tracking-widest">Audit Terminal</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
             {logs.map((log, i) => (
               <div key={i} className="flex gap-4 font-mono text-[11px] animate-fade-in-up">
                  <span className="text-slate-600 whitespace-nowrap">[{log.timestamp}]</span>
                  <span className={log.type === 'start' ? 'text-primary' : 'text-slate-400'}>{log.message}</span>
               </div>
             ))}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes progress-stripe { from { background-position: 0 0; } to { background-position: 1rem 0; } }
        .animate-fade-in-up { animation: fade-in-up 0.4s ease-out forwards; }
        @keyframes fade-in-up { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default DashboardProgress;
