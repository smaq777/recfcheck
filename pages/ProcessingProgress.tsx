import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppView } from '../types';
import { getAuthHeader } from '../auth-client';

interface ProcessingProgressProps {
  onNavigate: (view: AppView) => void;
}

interface ProgressData {
  progress: number;
  currentStep: string;
  status: 'processing' | 'completed' | 'failed';
  processedReferences: number;
  totalReferences: number;
  verifiedCount?: number;
  issuesCount?: number;
  warningsCount?: number;
}

interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

const ProcessingProgress: React.FC<ProcessingProgressProps> = ({ onNavigate }) => {
  const [progressData, setProgressData] = useState<ProgressData>({
    progress: 0,
    currentStep: 'Initializing...',
    status: 'processing',
    processedReferences: 0,
    totalReferences: 0,
  });
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);
  const lastStepRef = useRef<string>('');

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Add log entry
  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    const timestamp = new Date().toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    setLogs(prev => [...prev.slice(-50), { timestamp, message, type }]);
  }, []);

  // Connect to SSE for real-time progress
  useEffect(() => {
    const storedJobId = localStorage.getItem('current_job_id');
    const storedFileName = localStorage.getItem('current_file_name') || 'document';

    if (!storedJobId) {
      setError('No job ID found. Please upload a file first.');
      return;
    }

    console.log('[ProcessingProgress] ==> STARTING NEW ANALYSIS <==');
    console.log('[ProcessingProgress] Job ID:', storedJobId);
    console.log('[ProcessingProgress] File:', storedFileName);
    console.log('[ProcessingProgress] Timestamp:', new Date().toISOString());

    setJobId(storedJobId);
    setFileName(storedFileName);
    addLog(`Starting analysis for: ${storedFileName}`, 'info');
    addLog(`Job ID: ${storedJobId}`, 'info');

    let eventSource: EventSource | null = null;
    let pollInterval: NodeJS.Timeout | null = null;

    // First, fetch current job status to verify we have the right job
    const verifyJob = async () => {
      try {
        const authHeaders = getAuthHeader();
        const response = await fetch(`/api/results?jobId=${storedJobId}`, {
          headers: authHeaders,
        });
        if (response.ok) {
          const data = await response.json();
          console.log('[ProcessingProgress] Job verification COMPLETE:', {
            jobId: data.jobId,
            storedJobId: storedJobId,
            fileName: data.fileName,
            totalReferences: data.totalReferences,
            status: data.status,
            actualReferencesInDb: data.references?.length,
            verified: data.jobId === storedJobId ? 'MATCHES' : 'MISMATCH'
          });
          setProgressData(prev => ({
            ...prev,
            totalReferences: data.totalReferences || 0
          }));
          addLog(`Verified: ${data.totalReferences} references to analyze`, 'info');
        }
      } catch (e) {
        console.warn('[ProcessingProgress] Could not verify job:', e);
      }
    };

    verifyJob();

    // Connect to SSE endpoint
    const connectSSE = () => {
      eventSource = new EventSource(`/api/progress?jobId=${storedJobId}`);

      eventSource.onopen = () => {
        setIsConnected(true);
        addLog('Connected to processing server', 'success');
      };

      eventSource.onmessage = (event) => {
        try {
          const data: ProgressData = JSON.parse(event.data);
          console.log('[ProcessingProgress] Received SSE update:', {
            ...data,
            currentJobId: storedJobId,
            dataIsForCorrectJob: 'VERIFY THIS MATCHES'
          });

          // CRITICAL: Only update if we're still on the same job
          // This prevents stale SSE data from old jobs overriding new uploads
          setProgressData(prev => {
            // If totalReferences in SSE data is way different from what we verified,
            // keep our verified value and log a warning
            if (prev.totalReferences > 0 && data.totalReferences > 0 &&
              Math.abs(prev.totalReferences - data.totalReferences) > 10) {
              console.warn('[ProcessingProgress] SSE data mismatch!', {
                verifiedTotal: prev.totalReferences,
                sseTotal: data.totalReferences,
                keeping: 'verified value'
              });
              return {
                ...prev,
                progress: data.progress,
                currentStep: data.currentStep,
                status: data.status,
                processedReferences: data.processedReferences,
                // Keep our verified totalReferences, don't let SSE override it
              };
            }

            return {
              ...prev,
              ...data,
            };
          });

          // Add contextual log based on step changes
          if (data.currentStep && data.currentStep !== lastStepRef.current) {
            lastStepRef.current = data.currentStep;
            addLog(`Stage: ${data.currentStep}`, 'info');
          }

          // Add progress logs periodically
          if (data.processedReferences > 0 && data.processedReferences % 10 === 0) {
            addLog(`Processed ${data.processedReferences}/${data.totalReferences} references`, 'info');
          }

          // Check if completed
          if (data.status === 'completed') {
            addLog(`✅ Analysis complete! Found ${data.totalReferences} references.`, 'success');
            eventSource?.close();

            setTimeout(() => {
              onNavigate(AppView.RESULTS);
            }, 1500);
          }

          if (data.status === 'failed') {
            addLog('❌ Analysis failed. Please try again.', 'error');
            eventSource?.close();
            setError('Analysis failed. Please try again.');
          }
        } catch (e) {
          console.error('Error parsing SSE data:', e);
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource?.close();

        // Fall back to polling
        addLog('Connection interrupted, switching to polling...', 'warning');
        startPolling(storedJobId);
      };
    };

    // Fallback polling
    const startPolling = (jobId: string) => {
      if (pollInterval) return;

      const authHeaders = getAuthHeader();

      pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`/api/results?jobId=${jobId}`, {
            headers: authHeaders,
          });
          if (response.ok) {
            const data = await response.json();

            const newProgress = data.status === 'completed' ? 100 :
              Math.round((data.references?.length || 0) / (data.totalReferences || 1) * 100);

            setProgressData(prev => ({
              ...prev,
              progress: newProgress,
              status: data.status,
              processedReferences: data.references?.length || prev.processedReferences,
              totalReferences: data.totalReferences || prev.totalReferences,
              verifiedCount: data.verifiedCount,
              issuesCount: data.issuesCount,
              warningsCount: data.warningsCount,
            }));

            if (data.status === 'completed') {
              if (pollInterval) clearInterval(pollInterval);
              addLog(`✅ Analysis complete! ${data.totalReferences} references processed.`, 'success');

              setTimeout(() => {
                onNavigate(AppView.RESULTS);
              }, 1500);
            }
          }
        } catch (e) {
          console.error('Polling error:', e);
        }
      }, 1500);
    };

    // Start with SSE
    connectSSE();

    return () => {
      eventSource?.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [onNavigate, addLog]);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  // Get stage info
  const getStages = () => {
    const stages = [
      { name: 'Parsing Document', threshold: 15 },
      { name: 'Normalizing Metadata', threshold: 25 },
      { name: 'Registry Matching', threshold: 70 },
      { name: 'Duplicate Detection', threshold: 85 },
      { name: 'Issue Analysis', threshold: 95 },
      { name: 'Generating Report', threshold: 100 },
    ];

    return stages.map((stage, idx) => {
      let status: 'complete' | 'processing' | 'pending' = 'pending';
      let stageProgress = 0;

      const prevThreshold = idx > 0 ? stages[idx - 1].threshold : 0;

      if (progressData.progress >= stage.threshold) {
        status = 'complete';
        stageProgress = 100;
      } else if (progressData.progress > prevThreshold) {
        status = 'processing';
        stageProgress = ((progressData.progress - prevThreshold) / (stage.threshold - prevThreshold)) * 100;
      }

      return { ...stage, status, progress: Math.min(stageProgress, 100) };
    });
  };

  const stages = getStages();

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-red-600 text-3xl">error</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Processing Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => onNavigate(AppView.NEW_CHECK)}
            className="px-6 py-3 bg-[#1e3a5f] text-white rounded-lg font-semibold hover:bg-[#2d4a6f] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-lg">fact_check</span>
            </div>
            <h1 className="text-lg font-bold text-gray-900">CheckMyBib</h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></span>
            {isConnected ? 'Live' : 'Polling'}
          </div>
        </div>
      </header>

      {/* Main Content - 2 Column Layout */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* LEFT COLUMN - Status & Progress */}
          <div className="space-y-6">
            {/* Status Card */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-[#1e3a5f] to-blue-600 px-6 py-5 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold">
                      Analyzing {progressData.totalReferences || '...'} References
                    </h2>
                    <p className="text-blue-100 mt-1 text-sm truncate">{fileName}</p>
                  </div>
                  <div className="text-right ml-4">
                    <div className="text-3xl font-black">{progressData.progress}%</div>
                    <p className="text-blue-100 text-xs">Time: {formatTime(timeElapsed)}</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4 h-2.5 bg-blue-900/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progressData.progress}%` }}
                  />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-4 p-5 bg-gray-50 border-b border-gray-200">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {progressData.processedReferences}
                  </div>
                  <p className="text-xs text-gray-500 mt-1 font-medium uppercase">Processed</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {progressData.totalReferences - progressData.processedReferences}
                  </div>
                  <p className="text-xs text-gray-500 mt-1 font-medium uppercase">Pending</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-500">
                    {progressData.issuesCount ?? 0}
                    {(progressData.warningsCount ?? 0) > 0 && (
                      <span className="text-sm text-yellow-600 font-medium ml-1">
                        (+{progressData.warningsCount}!)
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1 font-medium uppercase">
                    {(progressData.warningsCount ?? 0) > 0 ? 'Problems Found' : 'Issues Found'}
                  </p>
                </div>
              </div>

              {/* Stages */}
              <div className="p-5">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
                  Process Roadmap
                </h3>
                <div className="space-y-3">
                  {stages.map((stage, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      {/* Status Icon */}
                      <div className="flex-shrink-0">
                        {stage.status === 'complete' && (
                          <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-green-600 text-base">check</span>
                          </div>
                        )}
                        {stage.status === 'processing' && (
                          <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center">
                            <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                        {stage.status === 'pending' && (
                          <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-gray-400 text-base">schedule</span>
                          </div>
                        )}
                      </div>

                      {/* Stage Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-sm font-medium truncate ${stage.status === 'complete' ? 'text-green-600' :
                              stage.status === 'processing' ? 'text-blue-600' :
                                'text-gray-400'
                            }`}>
                            {stage.name}
                          </span>
                          <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                            {stage.status === 'complete' ? 'Done' :
                              stage.status === 'processing' ? `${Math.round(stage.progress)}%` :
                                'Pending'}
                          </span>
                        </div>
                        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${stage.status === 'complete' ? 'bg-green-500' :
                                stage.status === 'processing' ? 'bg-blue-500' :
                                  'bg-gray-300'
                              }`}
                            style={{ width: `${stage.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Cancel Button */}
            <div className="text-center">
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to cancel? Progress will be lost.')) {
                    onNavigate(AppView.NEW_CHECK);
                  }
                }}
                className="px-6 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                Cancel Analysis
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN - Live Engine Room */}
          <div className="lg:sticky lg:top-6 h-fit">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-gray-500">terminal</span>
                  Live Engine Room
                </h3>
                <span className="text-xs px-2.5 py-1 bg-green-100 text-green-700 rounded-full font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                  LIVE FEED
                </span>
              </div>
              <div className="h-[calc(100vh-12rem)] overflow-y-auto bg-gray-900 p-4 font-mono text-sm">
                {logs.length === 0 ? (
                  <div className="text-gray-500 text-center py-8">
                    <div className="w-12 h-12 border-2 border-gray-700 border-t-gray-500 rounded-full animate-spin mx-auto mb-3" />
                    <p>Initializing analysis engine...</p>
                  </div>
                ) : (
                  <>
                    {logs.map((log, idx) => (
                      <div key={idx} className="flex gap-2 mb-1.5 leading-relaxed">
                        <span className="text-gray-600 flex-shrink-0 text-xs">{log.timestamp}</span>
                        <span className={`flex-1 ${log.type === 'success' ? 'text-green-400' :
                            log.type === 'warning' ? 'text-yellow-400' :
                              log.type === 'error' ? 'text-red-400' :
                                'text-gray-300'
                          }`}>
                          {log.type === 'success' && '✓ '}
                          {log.type === 'warning' && '⚠ '}
                          {log.type === 'error' && '✗ '}
                          {log.message}
                        </span>
                      </div>
                    ))}
                    <div ref={logEndRef} />
                  </>
                )}
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default ProcessingProgress;
