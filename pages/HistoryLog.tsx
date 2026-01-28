
import React, { useState, useEffect } from 'react';
import { AppView } from '../types';

interface HistoryLogProps {
  onNavigate: (view: AppView) => void;
}

interface JobRecord {
  id: string;
  fileName: string;
  createdAt: string;
  totalReferences: number;
  verifiedCount: number;
  issuesCount: number;
  status: string;
  confidenceScore?: number;
}

const HistoryLog: React.FC<HistoryLogProps> = ({ onNavigate }) => {
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'processing' | 'failed'>('all');
  const [selectedJob, setSelectedJob] = useState<JobRecord | null>(null);

  useEffect(() => {
    const loadJobs = async () => {
      setLoading(true);
      
      // 1. Try to load from API (Database)
      try {
        const storedUser = localStorage.getItem('refcheck_user');
        const userId = storedUser ? JSON.parse(storedUser).id : null;

        if (userId) {
          const response = await fetch(`/api/jobs?userId=${userId}`);
          if (response.ok) {
            const data = await response.json();
            const apiJobs = data.jobs.map((job: any) => ({
              id: job.id,
              fileName: job.file_name,
              createdAt: job.created_at || job.upload_time || new Date().toISOString(),
              totalReferences: job.total_references || 0,
              verifiedCount: job.verified_count || 0,
              issuesCount: job.issues_count || 0,
              status: job.status || 'processing',
              confidenceScore: Math.round(((job.verified_count || 0) / (job.total_references || 1)) * 100)
            }));
            
            // If we found jobs in DB, use them
            if (apiJobs.length > 0) {
              setJobs(apiJobs);
              setLoading(false);
              return;
            }
          }
        }
      } catch (error) {
        console.error('Error loading jobs from API:', error);
      }

      // 2. Fallback to LocalStorage (Legacy/Local)
      const loadedJobs: JobRecord[] = [];
      const jobKeys = Object.keys(localStorage).filter(key => key.startsWith('job_'));

      // Check job_* keys
      jobKeys.forEach(key => {
        try {
          const jobData = JSON.parse(localStorage.getItem(key) || '{}');
          if (jobData.fileName) {
            loadedJobs.push({
              id: key,
              fileName: jobData.fileName,
              createdAt: jobData.createdAt || new Date().toISOString(),
              totalReferences: jobData.references?.length || 0,
              verifiedCount: jobData.references?.filter((r: any) => r.status === 'verified').length || 0,
              issuesCount: jobData.references?.filter((r: any) => r.issues?.length > 0).length || 0,
              status: jobData.status || 'completed',
              confidenceScore: Math.round((jobData.references?.filter((r: any) => r.status === 'verified').length || 0) / (jobData.references?.length || 1) * 100)
            });
          }
        } catch (e) {
          console.error('Error loading job:', key, e);
        }
      });

      // Check recent_jobs key
      try {
        const recentJobs = JSON.parse(localStorage.getItem('recent_jobs') || '[]');
        if (Array.isArray(recentJobs)) {
          recentJobs.forEach((job: any) => {
            // Avoid duplicates if already loaded via job_* keys
            if (!loadedJobs.find(j => j.id === job.id)) {
              loadedJobs.push({
                id: job.id,
                fileName: job.fileName || job.file_name || 'Untitled',
                createdAt: job.createdAt || job.upload_time || new Date().toISOString(),
                totalReferences: job.totalReferences || job.total_references || 0,
                verifiedCount: job.verifiedCount || job.verified_count || 0,
                issuesCount: job.issuesCount || job.issues_count || 0,
                status: job.status || 'completed',
                confidenceScore: job.confidenceScore || 0
              });
            }
          });
        }
      } catch (e) {
        console.error('Error loading recent_jobs:', e);
      }

      loadedJobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setJobs(loadedJobs);
      setLoading(false);
    };

    loadJobs();
  }, []);

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.fileName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || job.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="material-symbols-outlined text-green-500 dark:text-green-400">check_circle</span>;
      case 'processing':
        return <span className="material-symbols-outlined text-blue-500 dark:text-blue-400 animate-spin">autorenew</span>;
      case 'failed':
        return <span className="material-symbols-outlined text-red-500 dark:text-red-400">error</span>;
      default:
        return <span className="material-symbols-outlined text-gray-400">help</span>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMins = Math.floor(diffTime / (1000 * 60));
        return `${diffMins}m ago`;
      }
      return `${diffHours}h ago`;
    }
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafb] to-[#eef1f7] dark:from-[#191d2e] dark:to-[#232942] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 w-full border-b border-[#e5eaf1] dark:border-[#2f3656] bg-white/80 dark:bg-[#1a1f2e]/80 backdrop-blur-lg">
        <div className="max-w-[1440px] mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-8 text-[#2c346d] dark:text-indigo-400">
              <svg className="w-full h-full" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path fill="currentColor" d="M24 4L4 14v20c0 8 20 10 20 10s20-2 20-10V14L24 4z"/>
              </svg>
            </div>
            <h1 className="text-[#2c346d] dark:text-white text-lg font-bold">CheckMyBib</h1>
          </div>
          <button 
            onClick={() => onNavigate(AppView.NEW_CHECK)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
          >
            <span className="material-symbols-outlined text-sm">add</span> New Check
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1200px] mx-auto w-full px-6 md:px-10 py-16">
        <div className="space-y-8">
          {/* Header Section */}
          <div>
            <h1 className="text-4xl font-black text-gray-900 dark:text-white">Verification History</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Track all your bibliography verifications</p>
          </div>

          {/* Search and Filter */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-[#e5eaf1] dark:border-[#2f3656] p-6">
            <div className="space-y-4">
              {/* Search */}
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                <input 
                  type="text"
                  placeholder="Search by filename..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-[#e5eaf1] dark:border-[#2f3656] rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Filter Tabs */}
              <div className="flex flex-wrap gap-2">
                {(['all', 'completed', 'processing', 'failed'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                      filterStatus === status
                        ? 'bg-[#2c346d] text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* History List */}
          {loading ? (
            <div className="flex flex-col items-center justify-center h-96">
              <div className="size-16 rounded-full bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-indigo-600 dark:text-indigo-400 animate-spin">autorenew</span>
              </div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading history...</p>
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96">
              <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600">history</span>
              <h3 className="mt-4 text-2xl font-black text-gray-900 dark:text-white">No History Found</h3>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Start by uploading a bibliography file</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredJobs.map((job) => (
                <div 
                  key={job.id}
                  onClick={() => setSelectedJob(job)}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-[#e5eaf1] dark:border-[#2f3656] p-6 hover:shadow-lg dark:hover:shadow-2xl transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{getStatusIcon(job.status)}</span>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">{job.fileName}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{formatDate(job.createdAt)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-black text-[#2c346d] dark:text-indigo-400">{job.totalReferences}</div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 font-semibold uppercase">Total</p>
                      </div>
                      <div>
                        <div className="text-2xl font-black text-green-600 dark:text-green-400">{job.verifiedCount}</div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 font-semibold uppercase">Verified</p>
                      </div>
                      <div>
                        <div className="text-2xl font-black text-red-600 dark:text-red-400">{job.issuesCount}</div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 font-semibold uppercase">Issues</p>
                      </div>
                      <div>
                        <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{job.confidenceScore || 0}%</div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 font-semibold uppercase">Score</p>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-500"
                      style={{ width: `${(job.verifiedCount / job.totalReferences) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Detail Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full">
            <div className="bg-gray-50 dark:bg-gray-700/50 border-b border-[#e5eaf1] dark:border-[#2f3656] px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900 dark:text-white">Job Details</h3>
              <button onClick={() => setSelectedJob(null)} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Filename</p>
                <p className="text-gray-900 dark:text-white font-semibold mt-1">{selectedJob.fileName}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Uploaded</p>
                <p className="text-gray-900 dark:text-white font-semibold mt-1">{new Date(selectedJob.createdAt).toLocaleString()}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Total References</p>
                  <p className="text-2xl font-black text-[#2c346d] dark:text-indigo-400 mt-1">{selectedJob.totalReferences}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Verified</p>
                  <p className="text-2xl font-black text-green-600 dark:text-green-400 mt-1">{selectedJob.verifiedCount}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Issues</p>
                  <p className="text-2xl font-black text-red-600 dark:text-red-400 mt-1">{selectedJob.issuesCount}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Score</p>
                  <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{selectedJob.confidenceScore || 0}%</p>
                </div>
              </div>
              <div className="flex gap-2 pt-4 border-t border-[#e5eaf1] dark:border-[#2f3656]">
                <button 
                  onClick={() => {
                    localStorage.setItem('current_job_id', selectedJob.id.replace('job_', ''));
                    onNavigate(AppView.RESULTS);
                  }}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700"
                >
                  View Results
                </button>
                <button 
                  onClick={() => setSelectedJob(null)}
                  className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white font-bold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryLog;
