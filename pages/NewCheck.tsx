
import React, { useState, useRef } from 'react';
import { AppView } from '../types';

interface NewCheckProps {
  onNavigate: (view: AppView) => void;
}

interface ValidationStep {
  label: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
}

const NewCheck: React.FC<NewCheckProps> = ({ onNavigate }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('upload');
  const [pastedText, setPastedText] = useState('');
  const [strictness, setStrictness] = useState('standard');
  const [showValidation, setShowValidation] = useState(false);
  const [validationSteps, setValidationSteps] = useState<ValidationStep[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const runValidation = (file: File) => {
    setShowValidation(true);
    const steps: ValidationStep[] = [
      { label: 'File type check', status: 'pending' },
      { label: 'File size verification', status: 'pending' },
      { label: 'Readable structure detection', status: 'pending' },
      { label: 'Password protection check', status: 'pending' },
      { label: 'Text extractability', status: 'pending' },
    ];
    setValidationSteps(steps);

    // Simulate validation sequence
    let current = 0;
    const interval = setInterval(() => {
      setValidationSteps(prev => {
        const next = [...prev];
        if (current === 0) {
          const isSupported = ['.bib', '.pdf', '.docx', '.tex', '.zip'].some(ext => file.name.endsWith(ext));
          next[current].status = isSupported ? 'success' : 'error';
          if (!isSupported) next[current].message = 'Unsupported file type';
        } else if (current === 1) {
          const isWithinLimit = file.size <= 50 * 1024 * 1024;
          next[current].status = isWithinLimit ? 'success' : 'error';
          if (!isWithinLimit) next[current].message = 'File size exceeds 50MB limit';
        } else {
          next[current].status = 'success';
        }
        return next;
      });
      
      current++;
      if (current >= steps.length) {
        clearInterval(interval);
      }
    }, 400);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      runValidation(file);
    }
  };

  const handleStartAnalysis = () => {
    setIsUploading(true);
    setTimeout(() => {
      onNavigate(AppView.PROGRESS);
    }, 500);
  };

  const isAllValid = validationSteps.length > 0 && validationSteps.every(s => s.status === 'success');

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 lg:py-16 relative">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start animate-fade-in">
        <div className="lg:col-span-8 flex flex-col gap-10">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">New Bibliography Audit</h1>
            <p className="text-slate-500 font-medium text-lg mt-2 max-w-xl">Upload your research references to secure metadata integrity and detect retracted works.</p>
          </div>

          <div className="flex p-1.5 bg-slate-100 rounded-2xl w-fit border border-border-light shadow-inner">
            <button 
              onClick={() => setActiveTab('upload')}
              className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'upload' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Document Upload
            </button>
            <button 
              onClick={() => setActiveTab('paste')}
              className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'paste' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Direct Entry
            </button>
          </div>

          {activeTab === 'upload' ? (
            <div className="group relative flex flex-col items-center justify-center gap-10 rounded-[3rem] border-2 border-dashed border-border-light hover:border-primary bg-white px-8 py-24 transition-all duration-500 shadow-sm hover:shadow-2xl cursor-pointer">
              <input 
                ref={fileInputRef}
                type="file" 
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                accept=".bib,.ris,.pdf,.docx,.tex"
              />
              <div className="size-24 rounded-3xl bg-blue-50 text-primary flex items-center justify-center group-hover:rotate-12 group-hover:scale-110 transition-all duration-500">
                <span className="material-symbols-outlined text-[48px]">upload_file</span>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-3xl font-black text-slate-900 group-hover:text-primary transition-colors">Drop BibTeX or PDF</h3>
                <p className="text-slate-400 font-medium max-w-xs mx-auto">We'll automatically extract keys, titles, and DOIs for validation.</p>
              </div>
              <button className="px-12 py-4 rounded-2xl bg-primary text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-all">
                Select File
              </button>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in">
              <textarea 
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="@article{smith2021, ...}"
                className="w-full h-96 rounded-[2.5rem] border-border-light bg-white p-8 font-mono text-sm focus:ring-4 focus:ring-primary/5 transition-all shadow-inner leading-relaxed"
              />
              <button 
                onClick={() => onNavigate(AppView.PROGRESS)}
                disabled={!pastedText.trim()}
                className="w-full h-16 rounded-2xl bg-primary text-white font-black text-lg shadow-2xl shadow-primary/30 hover:-translate-y-1 active:translate-y-0 transition-all disabled:opacity-50"
              >
                Start Verification Scan
              </button>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 space-y-8">
           <div className="bg-white rounded-[2.5rem] border border-border-light p-10 shadow-sm space-y-10 sticky top-24">
              <div className="flex items-center gap-3 pb-4 border-b border-border-light">
                 <span className="material-symbols-outlined text-primary font-black">tune</span>
                 <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Audit Config</h3>
              </div>

              <div className="space-y-4">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Audit Protocol</label>
                 <div className="grid gap-3">
                   {[
                     { id: 'standard', label: 'Balanced Check', desc: 'Registry match + AI insight', icon: 'verified' },
                     { id: 'strict', label: 'Academic Rigor', desc: 'Exact match + Retraction scan', icon: 'gavel' }
                   ].map(opt => (
                     <button 
                       key={opt.id}
                       onClick={() => setStrictness(opt.id)}
                       className={`flex items-start gap-4 p-5 rounded-2xl border transition-all text-left group ${
                         strictness === opt.id ? 'border-primary bg-primary/5 ring-4 ring-primary/5' : 'border-border-light hover:border-slate-300'
                       }`}
                     >
                       <span className={`material-symbols-outlined text-2xl ${strictness === opt.id ? 'text-primary' : 'text-slate-300'}`}>{opt.icon}</span>
                       <div>
                         <span className={`text-sm font-black block ${strictness === opt.id ? 'text-primary' : 'text-slate-900'}`}>{opt.label}</span>
                         <span className="text-[10px] text-slate-400 font-medium leading-tight block mt-1">{opt.desc}</span>
                       </div>
                     </button>
                   ))}
                 </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-border-light">
                 <div className="flex items-center justify-between group cursor-pointer">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-900 group-hover:text-primary transition-colors">Registry Deep Search</span>
                      <span className="text-[9px] text-slate-400 uppercase tracking-widest font-black">Sync with OpenAlex</span>
                    </div>
                    <div className="w-10 h-5 bg-primary rounded-full relative shadow-inner"><div className="absolute right-1 top-1 size-3 bg-white rounded-full"></div></div>
                 </div>
                 <div className="flex items-center justify-between group cursor-pointer">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-900 group-hover:text-primary transition-colors">Gemini AI Audit</span>
                      <span className="text-[9px] text-slate-400 uppercase tracking-widest font-black">Expert Remediation</span>
                    </div>
                    <div className="w-10 h-5 bg-primary rounded-full relative shadow-inner"><div className="absolute right-1 top-1 size-3 bg-white rounded-full"></div></div>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Validation Modal */}
      {showValidation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-up">
            <div className="px-10 py-8 border-b border-border-light flex items-center justify-between bg-slate-50">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">description</span>
                Validating File...
              </h3>
              <button onClick={() => setShowValidation(false)} className="text-slate-400 hover:text-slate-900 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <div className="p-10 space-y-6">
              <div className="space-y-4">
                {validationSteps.map((step, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {step.status === 'pending' ? (
                        <div className="size-5 rounded-full border-2 border-slate-200 border-t-primary animate-spin"></div>
                      ) : step.status === 'success' ? (
                        <span className="material-symbols-outlined text-success font-black text-[20px]">check_circle</span>
                      ) : (
                        <span className="material-symbols-outlined text-error font-black text-[20px]">cancel</span>
                      )}
                      <span className={`text-sm font-bold ${step.status === 'error' ? 'text-error' : 'text-slate-600'}`}>{step.label}</span>
                    </div>
                    {step.message && <span className="text-[10px] font-black uppercase text-error tracking-widest">{step.message}</span>}
                  </div>
                ))}
              </div>

              {isAllValid && (
                <div className="bg-green-50 rounded-2xl p-5 border border-green-100 flex items-center gap-4 animate-fade-in">
                  <span className="material-symbols-outlined text-success">task</span>
                  <p className="text-sm font-bold text-success">Ready to analyze 127 references</p>
                </div>
              )}

              <div className="pt-4 grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setShowValidation(false)}
                  className="h-14 rounded-xl border border-border-light text-slate-500 font-bold hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  disabled={!isAllValid || isUploading}
                  onClick={handleStartAnalysis}
                  className="h-14 rounded-xl bg-primary text-white font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                >
                  {isUploading ? 'Booting Engine...' : 'Continue to Analysis'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewCheck;
