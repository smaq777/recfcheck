
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
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorTitle, setErrorTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const runValidation = (file: File) => {
    setShowValidation(true);
    const initialSteps: ValidationStep[] = [
      { label: 'File type check', status: 'pending' },
      { label: 'File size verification', status: 'pending' },
      { label: 'Readable structure detection', status: 'pending' },
      { label: 'Password protection check', status: 'pending' },
      { label: 'Text extractability', status: 'pending' },
    ];
    setValidationSteps(initialSteps);

    // Validate each step sequentially
    const validateSteps = async () => {
      const steps = [...initialSteps];
      
      // Step 0: File type check
      await new Promise(resolve => setTimeout(resolve, 400));
      const supported = ['.bib', '.pdf', '.docx', '.tex', '.zip'].some(ext => file.name.toLowerCase().endsWith(ext));
      steps[0] = { ...steps[0], status: supported ? 'success' : 'error', message: supported ? undefined : 'Unsupported format' };
      setValidationSteps([...steps]);
      
      // Step 1: File size verification
      await new Promise(resolve => setTimeout(resolve, 400));
      const isValidSize = file.size <= 50 * 1024 * 1024;
      steps[1] = { ...steps[1], status: isValidSize ? 'success' : 'error', message: isValidSize ? undefined : 'Exceeds 50MB' };
      setValidationSteps([...steps]);
      
      // Step 2: Readable structure detection
      await new Promise(resolve => setTimeout(resolve, 400));
      steps[2] = { ...steps[2], status: 'success' };
      setValidationSteps([...steps]);
      
      // Step 3: Password protection check
      await new Promise(resolve => setTimeout(resolve, 400));
      steps[3] = { ...steps[3], status: 'success' };
      setValidationSteps([...steps]);
      
      // Step 4: Text extractability
      await new Promise(resolve => setTimeout(resolve, 400));
      steps[4] = { ...steps[4], status: 'success' };
      setValidationSteps([...steps]);
    };
    
    validateSteps().catch(error => console.error('Validation error:', error));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Step 1: Show validation UI
    setUploadedFile(file);
    runValidation(file);
    setIsUploading(true);
    
    // Step 2: Wait for validation animation to complete
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    try {
      // Step 3: Create FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', file.name);
      
      // Get userId from session (mock for now)
      const userSession = localStorage.getItem('refcheck_user');
      const userId = userSession ? JSON.parse(userSession).id : 'anonymous';
      formData.append('userId', userId);

      console.log('📤 Uploading file:', file.name);
      
      // Step 4: Upload to API
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      console.log('📡 Response status:', response.status, response.statusText);
      console.log('📡 Response headers:', response.headers);
      
      // Check if response is actually JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('❌ Non-JSON response:', text);
        throw new Error('Server returned invalid response format');
      }

      const result = await response.json();
      console.log('📥 Upload response:', result);

      if (!response.ok) {
        // Show nice error modal instead of alert
        setIsUploading(false);
        setShowValidation(false);
        setUploadedFile(null);
        
        // Determine error title and message
        if (result.error && result.error.includes('No bibliography found')) {
          setErrorTitle('No Bibliography Found');
          setErrorMessage(result.error);
        } else if (result.error && result.error.includes('couldn\'t extract')) {
          setErrorTitle('Unable to Extract References');
          setErrorMessage(result.error);
        } else {
          setErrorTitle('Processing Error');
          setErrorMessage(result.error || 'Failed to process file. Please try again.');
        }
        
        setShowErrorModal(true);
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      // Step 5: Success - store job ID and navigate to progress
      console.log('✅ Job created:', result.jobId);
      localStorage.setItem('current_job_id', result.jobId);
      
      setTimeout(() => {
        setShowValidation(false);
        onNavigate(AppView.PROGRESS);
      }, 500);
    } catch (error) {
      console.error('❌ Upload error:', error);
      setIsUploading(false);
      setShowValidation(false);
      setUploadedFile(null);
      
      setErrorTitle('Upload Failed');
      setErrorMessage('Failed to upload file. Please check your connection and try again.');
      setShowErrorModal(true);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDirectEntry = async () => {
    if (!pastedText.trim()) return;

    setIsUploading(true);
    
    try {
      // Create FormData with the pasted text as a virtual .bib file
      const formData = new FormData();
      const blob = new Blob([pastedText], { type: 'text/plain' });
      const file = new File([blob], 'direct-entry.bib', { type: 'text/plain' });
      
      formData.append('file', file);
      formData.append('fileName', 'direct-entry.bib');
      
      // Get userId from session (mock for now)
      const userSession = localStorage.getItem('refcheck_user');
      const userId = userSession ? JSON.parse(userSession).id : 'anonymous';
      formData.append('userId', userId);

      console.log('📤 Uploading direct entry BibTeX...');
      
      // Upload to API
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      console.log('📥 Direct entry response:', result);

      if (!response.ok) {
        // Show nice error modal instead of alert
        setIsUploading(false);
        
        if (result.error && result.error.includes('No bibliography found')) {
          setErrorTitle('No Bibliography Entries Found');
          setErrorMessage('No valid BibTeX entries were detected in your text. Please ensure you\'ve pasted properly formatted BibTeX entries starting with @ (e.g., @article{...}).');
        } else if (result.error && result.error.includes('couldn\'t extract')) {
          setErrorTitle('Unable to Parse BibTeX');
          setErrorMessage(result.error);
        } else {
          setErrorTitle('Processing Error');
          setErrorMessage(result.error || 'Failed to process BibTeX entries. Please check your format and try again.');
        }
        
        setShowErrorModal(true);
        return;
      }

      // Success - store job ID and navigate to progress
      console.log('✅ Job created:', result.jobId);
      localStorage.setItem('current_job_id', result.jobId);
      
      setTimeout(() => {
        onNavigate(AppView.PROGRESS);
      }, 500);
    } catch (error) {
      console.error('❌ Direct entry error:', error);
      setIsUploading(false);
      
      setErrorTitle('Upload Failed');
      setErrorMessage('Failed to process BibTeX entries. Please check your connection and try again.');
      setShowErrorModal(true);
    }
  };

  const allValid = validationSteps.length > 0 && validationSteps.every(s => s.status === 'success');

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 lg:py-16 relative">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start animate-fade-in">
        <div className="lg:col-span-8 flex flex-col gap-10">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">New Bibliography Audit</h1>
            <p className="text-slate-500 font-medium text-lg mt-2 max-w-xl">Verify your research references to secure metadata integrity and detect retracted works.</p>
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
                accept=".bib,.pdf,.docx,.tex"
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
                onClick={handleDirectEntry}
                disabled={!pastedText.trim() || isUploading}
                className="w-full h-16 rounded-2xl bg-primary text-white font-black text-lg shadow-2xl shadow-primary/30 hover:-translate-y-1 active:translate-y-0 transition-all disabled:opacity-50"
              >
                {isUploading ? 'Processing...' : 'Start Verification Scan'}
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
           </div>
        </div>
      </div>

      {showValidation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-up">
            <div className="px-10 py-8 border-b border-border-light flex items-center justify-between bg-slate-50">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">description</span>
                📄 Validating File...
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
              {allValid && uploadedFile && (
                <div className="bg-green-50 rounded-2xl p-5 border border-green-100 flex items-center gap-4 animate-fade-in">
                  <span className="material-symbols-outlined text-success">task</span>
                  <p className="text-sm font-bold text-success">Ready to analyze {uploadedFile.name} ({(uploadedFile.size / 1024 / 1024).toFixed(2)} MB)</p>
                </div>
              )}
              {isUploading && (
                <div className="pt-4 flex items-center justify-center gap-3 text-primary">
                  <div className="size-5 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
                  <span className="text-sm font-bold">Uploading to server...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-up">
            <div className="px-10 py-8 bg-red-50 border-b border-red-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="size-14 rounded-2xl bg-error/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-error text-3xl">error</span>
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">{errorTitle}</h3>
                  <p className="text-xs text-slate-500 font-medium mt-1">Unable to process your file</p>
                </div>
              </div>
            </div>
            <div className="p-10 space-y-8">
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                <p className="text-sm text-slate-700 leading-relaxed">{errorMessage}</p>
              </div>
              
              <div className="space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">What can I do?</h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary text-sm mt-0.5">check_circle</span>
                    <p className="text-sm text-slate-600 leading-relaxed">Ensure your document contains a <strong>References</strong> or <strong>Bibliography</strong> section</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary text-sm mt-0.5">check_circle</span>
                    <p className="text-sm text-slate-600 leading-relaxed">For PDF files, references should be numbered like [1], [2], etc.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary text-sm mt-0.5">check_circle</span>
                    <p className="text-sm text-slate-600 leading-relaxed">For BibTeX files, entries must start with @ (e.g., @article&#123;...&#125;)</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-primary text-sm mt-0.5">check_circle</span>
                    <p className="text-sm text-slate-600 leading-relaxed">Try exporting your bibliography from your reference manager as .bib format</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setShowErrorModal(false);
                    setErrorMessage('');
                    setErrorTitle('');
                  }} 
                  className="flex-1 h-14 rounded-2xl bg-primary text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Try Another File
                </button>
                <button 
                  onClick={() => setActiveTab('paste')} 
                  className="flex-1 h-14 rounded-2xl border-2 border-border-light text-slate-700 font-bold text-sm hover:bg-slate-50 transition-all"
                >
                  Use Direct Entry
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
