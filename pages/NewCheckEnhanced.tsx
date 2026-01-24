import React, { useState, useRef } from 'react';
import { AppView } from '../types';
import { getAuthHeader } from '../auth-client';

interface NewCheckProps {
  onNavigate: (view: AppView) => void;
}

interface ValidationStep {
  label: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
}

const NewCheckEnhanced: React.FC<NewCheckProps> = ({ onNavigate }) => {
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

    const validateSteps = async () => {
      const steps = [...initialSteps];

      await new Promise(resolve => setTimeout(resolve, 400));
      const supported = ['.bib', '.pdf', '.docx', '.tex', '.zip'].some(ext => file.name.toLowerCase().endsWith(ext));
      steps[0] = { ...steps[0], status: supported ? 'success' : 'error', message: supported ? undefined : 'Unsupported format' };
      setValidationSteps([...steps]);

      await new Promise(resolve => setTimeout(resolve, 400));
      const isValidSize = file.size <= 50 * 1024 * 1024;
      steps[1] = { ...steps[1], status: isValidSize ? 'success' : 'error', message: isValidSize ? undefined : 'Exceeds 50MB' };
      setValidationSteps([...steps]);

      await new Promise(resolve => setTimeout(resolve, 400));
      steps[2] = { ...steps[2], status: 'success' };
      setValidationSteps([...steps]);

      await new Promise(resolve => setTimeout(resolve, 400));
      steps[3] = { ...steps[3], status: 'success' };
      setValidationSteps([...steps]);

      await new Promise(resolve => setTimeout(resolve, 400));
      steps[4] = { ...steps[4], status: 'success' };
      setValidationSteps([...steps]);
    };

    validateSteps().catch(error => console.error('Validation error:', error));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    runValidation(file);
    setIsUploading(true);

    await new Promise(resolve => setTimeout(resolve, 2500));

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', file.name);

      const userSession = localStorage.getItem('refcheck_user');
      const userId = userSession ? JSON.parse(userSession).id : 'anonymous';
      formData.append('userId', userId);

      console.log('📤 Uploading file:', file.name);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          ...getAuthHeader(),
        },
        body: formData,
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('❌ Non-JSON response:', text);
        throw new Error('Server returned invalid response format');
      }

      const result = await response.json();

      if (!response.ok) {
        setIsUploading(false);
        setShowValidation(false);
        setUploadedFile(null);

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

        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

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

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDirectEntry = async () => {
    if (!pastedText.trim()) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      const blob = new Blob([pastedText], { type: 'text/plain' });
      const file = new File([blob], 'direct-entry.bib', { type: 'text/plain' });

      formData.append('file', file);
      formData.append('fileName', 'direct-entry.bib');

      const userSession = localStorage.getItem('refcheck_user');
      const userId = userSession ? JSON.parse(userSession).id : 'anonymous';
      formData.append('userId', userId);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          ...getAuthHeader(),
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        setIsUploading(false);

        if (result.error && result.error.includes('No bibliography found')) {
          setErrorTitle('No Bibliography Entries Found');
          setErrorMessage('No valid BibTeX entries were detected in your text.');
        } else {
          setErrorTitle('Processing Error');
          setErrorMessage(result.error || 'Failed to process BibTeX entries. Please check your format.');
        }

        setShowErrorModal(true);
        return;
      }

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
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafb] to-[#eef1f7] dark:from-[#191d2e] dark:to-[#232942]">
      {/* Header with navigation */}
      <header className="sticky top-0 z-40 w-full border-b border-[#e5eaf1] dark:border-[#2f3656] bg-white/80 dark:bg-[#1a1f2e]/80 backdrop-blur-lg">
        <div className="max-w-[1440px] mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-8 text-[#2c346d] dark:text-indigo-400">
              <svg className="w-full h-full" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path fill="currentColor" d="M24 4L4 14v20c0 8 20 10 20 10s20-2 20-10V14L24 4z" />
              </svg>
            </div>
            <h1 className="text-[#2c346d] dark:text-white text-lg font-bold">RefCheck</h1>
          </div>

        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1200px] mx-auto px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Upload Area */}
          <div className="lg:col-span-2 space-y-8">
            {/* Page Header */}
            <div className="space-y-3">
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white leading-tight tracking-tight">
                Bibliography Check
              </h2>
              <p className="text-gray-600 dark:text-gray-300 text-lg font-medium max-w-2xl">
                Verify your research references to detect issues, retracted papers, and metadata inconsistencies.
              </p>
            </div>

            {/* Tabs */}
            <div className="inline-flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setActiveTab('upload')}
                className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab === 'upload'
                  ? 'bg-white dark:bg-gray-700 text-[#2c346d] dark:text-indigo-400 shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                <span className="material-symbols-outlined inline-block mr-2">upload_file</span>
                Upload Document
              </button>
              <button
                onClick={() => setActiveTab('paste')}
                className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${activeTab === 'paste'
                  ? 'bg-white dark:bg-gray-700 text-[#2c346d] dark:text-indigo-400 shadow-md'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                <span className="material-symbols-outlined inline-block mr-2">note_add</span>
                Direct Entry
              </button>
            </div>

            {/* Upload Zone or Direct Entry Form */}
            {activeTab === 'upload' ? (
              <div className="relative group">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  accept=".bib,.pdf,.docx,.tex,.zip"
                />
                <div className="flex flex-col items-center justify-center gap-6 rounded-3xl border-2 border-dashed border-[#e5eaf1] dark:border-[#2f3656] hover:border-[#2c346d] dark:hover:border-indigo-400 bg-white/50 dark:bg-gray-800/30 px-8 py-24 transition-all duration-300 cursor-pointer group-hover:shadow-xl">
                  <div className="size-20 rounded-2xl bg-blue-100 dark:bg-blue-900/30 text-[#2c346d] dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                    <span className="material-symbols-outlined text-5xl">cloud_upload</span>
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-3xl font-black text-gray-900 dark:text-white">Drop your files here</h3>
                    <p className="text-gray-500 dark:text-gray-400 font-medium max-w-xs">
                      Supports BibTeX, PDF, DOCX, TEX files up to 50MB
                    </p>
                  </div>
                  <button className="px-8 py-3 rounded-xl bg-[#2c346d] hover:bg-[#1f2552] text-white font-bold text-sm shadow-lg transition-all hover:scale-105">
                    Choose File
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Paste your BibTeX entries here...&#10;&#10;@article{smith2021,...}&#10;@book{doe2020,...}"
                  className="w-full h-80 rounded-2xl border border-[#e5eaf1] dark:border-[#2f3656] bg-white dark:bg-gray-800 p-6 font-mono text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-[#2c346d] dark:focus:ring-indigo-400 focus:border-transparent transition-all resize-none placeholder-gray-400 dark:placeholder-gray-500"
                />
                <button
                  onClick={handleDirectEntry}
                  disabled={!pastedText.trim() || isUploading}
                  className="w-full py-4 rounded-xl bg-[#2c346d] hover:bg-[#1f2552] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-lg shadow-xl transition-all hover:scale-[1.02] active:scale-95"
                >
                  {isUploading ? (
                    <>
                      <span className="material-symbols-outlined inline-block mr-2 animate-spin">hourglass_top</span>
                      Processing...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined inline-block mr-2">play_arrow</span>
                      Start Verification
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Features Grid */}
            <div className="grid grid-cols-3 gap-4 mt-12">
              <div className="flex flex-col items-center text-center p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <span className="material-symbols-outlined text-[#2c346d] dark:text-indigo-400 text-3xl mb-2">verified_user</span>
                <p className="text-xs font-bold text-gray-600 dark:text-gray-300">Instant Verification</p>
              </div>
              <div className="flex flex-col items-center text-center p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <span className="material-symbols-outlined text-[#2c346d] dark:text-indigo-400 text-3xl mb-2">search</span>
                <p className="text-xs font-bold text-gray-600 dark:text-gray-300">Cross-Database Check</p>
              </div>
              <div className="flex flex-col items-center text-center p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <span className="material-symbols-outlined text-[#2c346d] dark:text-indigo-400 text-3xl mb-2">error</span>
                <p className="text-xs font-bold text-gray-600 dark:text-gray-300">Retraction Detection</p>
              </div>
            </div>
          </div>

          {/* Right Column - Configuration */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              {/* Info Box */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 border border-blue-100 dark:border-blue-900/30 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="size-10 rounded-xl bg-blue-100 dark:bg-blue-800 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">tips_and_updates</span>
                  </div>
                  <div className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                    <p className="font-black text-base mb-2 flex items-center gap-2">
                      Pro Tip
                    </p>
                    <p className="font-medium opacity-90">
                      Upload your bibliography in <strong>BibTeX format</strong> for fastest processing and most accurate results.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Validation Modal */}
      {showValidation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in">
            <div className="px-8 py-6 border-b border-[#e5eaf1] dark:border-[#2f3656] bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-800">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#2c346d] dark:text-indigo-400 text-2xl">description</span>
                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">Validating File</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{uploadedFile?.name}</p>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-5">
              {validationSteps.map((step, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    {step.status === 'pending' && (
                      <div className="size-5 rounded-full border-2 border-gray-300 dark:border-gray-600 border-t-[#2c346d] dark:border-t-indigo-400 animate-spin"></div>
                    )}
                    {step.status === 'success' && (
                      <span className="material-symbols-outlined text-green-500 dark:text-green-400 font-bold">check_circle</span>
                    )}
                    {step.status === 'error' && (
                      <span className="material-symbols-outlined text-red-500 dark:text-red-400 font-bold">cancel</span>
                    )}
                    <span className={`text-sm font-semibold ${step.status === 'error' ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      {step.label}
                    </span>
                  </div>
                  {step.message && (
                    <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider">{step.message}</span>
                  )}
                </div>
              ))}

              {allValid && (
                <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 flex items-center gap-3 animate-in fade-in">
                  <span className="material-symbols-outlined text-green-600 dark:text-green-400">task_alt</span>
                  <p className="text-sm font-semibold text-green-700 dark:text-green-300">Ready to analyze</p>
                </div>
              )}

              {isUploading && (
                <div className="mt-4 flex items-center justify-center gap-2 text-[#2c346d] dark:text-indigo-400">
                  <div className="size-4 rounded-full border-2 border-current border-t-transparent animate-spin"></div>
                  <span className="text-sm font-semibold">Uploading to server...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in">
            {/* Error Header */}
            <div className="px-8 py-6 border-b border-[#e5eaf1] dark:border-[#2f3656] bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20">
              <div className="flex items-start gap-4">
                <div className="size-12 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-2xl">error</span>
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">{errorTitle}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Unable to process your file</p>
                </div>
              </div>
            </div>

            {/* Error Content */}
            <div className="p-8 space-y-6">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-5 border border-gray-200 dark:border-gray-600">
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{errorMessage}</p>
              </div>

              {/* Suggestions */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider">Try these steps:</h4>
                <div className="space-y-2">
                  {[
                    'Ensure your document contains a References or Bibliography section',
                    'For PDFs, references should be numbered like [1], [2], etc.',
                    'For BibTeX, entries must start with @ (e.g., @article{...})',
                    'Try exporting from your reference manager as .bib format'
                  ].map((tip, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-[#2c346d] dark:text-indigo-400 text-sm mt-0.5">check_circle</span>
                      <p className="text-sm text-gray-600 dark:text-gray-300">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-[#e5eaf1] dark:border-[#2f3656]">
                <button
                  onClick={() => {
                    setShowErrorModal(false);
                    setErrorMessage('');
                    setErrorTitle('');
                  }}
                  className="flex-1 py-3 rounded-lg bg-[#2c346d] hover:bg-[#1f2552] text-white font-bold text-sm transition-all"
                >
                  Try Another File
                </button>
                <button
                  onClick={() => setActiveTab('paste')}
                  className="flex-1 py-3 rounded-lg border-2 border-[#e5eaf1] dark:border-[#2f3656] text-gray-700 dark:text-gray-300 font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
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

export default NewCheckEnhanced;
