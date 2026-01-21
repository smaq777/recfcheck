
import React, { useState, useEffect } from 'react';
import { AppView, VerificationJob } from '../types';

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
}

const HistoryLog: React.FC<HistoryLogProps> = ({ onNavigate }) => {
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load jobs from localStorage (where they're stored by dev-server)
    const loadJobs = () => {
      const jobKeys = Object.keys(localStorage).filter(key => key.startsWith('job_'));
      const loadedJobs: JobRecord[] = [];

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
              status: jobData.status || 'completed'
            });
          }
        } catch (e) {
          console.error('Error loading job:', key, e);
        }
      });

      // Sort by date (newest first)
      loadedJobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setJobs(loadedJobs);
      setLoading(false);
    };

    loadJobs();
  }, []);

  const handleDownloadAll = () => {
    if (jobs.length === 0) {
      alert('No jobs to export');
      return;
    }
    
    // Export real jobs data
    const headers = "Date,Filename,Entries,Verified,Issues,Status\n";
    const rows = jobs.map(job => {
      const date = new Date(job.createdAt).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
      return `${date},${job.fileName},${job.totalReferences},${job.verifiedCount},${job.issuesCount},${job.status}`;
    }).join("\n");
    
    const csvContent = "data:text/csv;charset=utf-8," + headers + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `refcheck_history_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewResults = (jobId: string) => {
    localStorage.setItem('current_job_id', jobId);
    onNavigate(AppView.RESULTS);
  };

  if (loading) {
    return (
      <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-12 flex items-center justify-center">
        <div className="text-center">
          <div className="size-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4"></div>
          <p className="text-slate-500 font-medium">Loading history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-12 lg:px-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-3">Verification History</h1>
          <p className="text-slate-500 text-lg font-medium max-w-2xl leading-relaxed">
            Archive of all bibliography verification jobs. Review past results, analyze issues, and manage your verification records.
          </p>
        </div>
        <button 
          onClick={handleDownloadAll}
          className="flex items-center gap-3 px-8 py-4 rounded-xl bg-primary text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary-hover transition-all"
        >
          <span className="material-symbols-outlined">download_for_offline</span>
          Download All
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-8 items-center justify-between">
        <div className="relative w-full md:max-w-md group">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
          <input 
            type="text" 
            placeholder="Search by filename..."
            className="w-full h-12 pl-12 pr-4 rounded-xl border-border-light bg-white focus:ring-2 focus:ring-primary/20 text-sm font-medium shadow-sm"
          />
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <select className="h-12 px-4 rounded-xl border-border-light bg-white text-sm font-bold text-slate-700 shadow-sm focus:ring-2 focus:ring-primary/20">
            <option>Last 30 Days</option>
            <option>Last 7 Days</option>
            <option>This Year</option>
          </select>
          <button className="h-12 px-6 rounded-xl bg-white border border-border-light text-slate-500 hover:text-primary font-bold flex items-center gap-2 transition-all shadow-sm">
            <span className="material-symbols-outlined text-[20px]">filter_list</span>
            Filters
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border-light shadow-sm overflow-hidden mb-8">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-border-light">
            <tr>
              <th className="px-8 py-5">Date</th>
              <th className="px-8 py-5">Filename</th>
              <th className="px-8 py-5">Entries</th>
              <th className="px-8 py-5">Status</th>
              <th className="px-8 py-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light font-bold">
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-8 py-12 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <span className="material-symbols-outlined text-slate-300 text-[64px]">folder_open</span>
                    <p className="text-slate-400 font-medium">No verification jobs yet. Upload a file to get started!</p>
                    <button 
                      onClick={() => onNavigate(AppView.NEW_CHECK)}
                      className="mt-4 px-6 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary-hover transition-all"
                    >
                      Start New Check
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              jobs.map(job => {
                const date = new Date(job.createdAt).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric' 
                });
                
                return (
                  <tr key={job.id} className="group hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-6 text-slate-400 text-sm">{date}</td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-blue-500">description</span>
                        <span className="text-slate-900">{job.fileName}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-slate-600">{job.totalReferences}</td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-success text-[10px] font-black border border-green-100 uppercase tracking-widest">
                          <span className="size-1.5 rounded-full bg-success"></span>
                          {job.verifiedCount} Checked
                        </span>
                        {job.issuesCount > 0 && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-error text-[10px] font-black border border-red-100 uppercase tracking-widest">
                            <span className="size-1.5 rounded-full bg-error"></span>
                            {job.issuesCount} Issues
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleViewResults(job.id)}
                          className="px-4 py-2 rounded-lg text-primary hover:bg-primary/5 font-black text-[10px] uppercase tracking-widest transition-all"
                        >
                          View Results
                        </button>
                        <button className="p-2 rounded-full hover:bg-slate-100 text-slate-400">
                          <span className="material-symbols-outlined text-[20px]">more_vert</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HistoryLog;
