
import React from 'react';
import { AppView, VerificationJob } from '../types';

interface HistoryLogProps {
  onNavigate: (view: AppView) => void;
}

const HistoryLog: React.FC<HistoryLogProps> = ({ onNavigate }) => {
  const mockJobs: VerificationJob[] = [
    { id: '1', fileName: 'thesis_final_v2.bib', date: 'Oct 24, 2023', entriesCount: 142, verifiedCount: 138, issuesCount: 4, warningsCount: 0, status: 'issues' },
    { id: '2', fileName: 'research_paper_draft.bib', date: 'Oct 20, 2023', entriesCount: 89, verifiedCount: 89, issuesCount: 0, warningsCount: 0, status: 'clean' },
    { id: '3', fileName: 'journal_submission_v1.bib', date: 'Sep 15, 2023', entriesCount: 210, verifiedCount: 150, issuesCount: 60, warningsCount: 0, status: 'issues' },
    { id: '4', fileName: 'lab_notes_summary.txt', date: 'Sep 02, 2023', entriesCount: 45, verifiedCount: 42, issuesCount: 3, warningsCount: 0, status: 'issues' }
  ];

  const handleDownloadAll = () => {
    // Simulated CSV export logic
    const headers = "Date,Filename,Entries,Verified,Issues,Status\n";
    const rows = mockJobs.map(job => 
      `${job.date},${job.fileName},${job.entriesCount},${job.verifiedCount},${job.issuesCount},${job.status}`
    ).join("\n");
    
    const csvContent = "data:text/csv;charset=utf-8," + headers + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "refcheck_history_full.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert("Full history export started. Generating CSV for all jobs...");
  };

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
            {mockJobs.map(job => (
              <tr key={job.id} className="group hover:bg-slate-50 transition-colors">
                <td className="px-8 py-6 text-slate-400 text-sm">{job.date}</td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-blue-500">description</span>
                    <span className="text-slate-900">{job.fileName}</span>
                  </div>
                </td>
                <td className="px-8 py-6 text-slate-600">{job.entriesCount}</td>
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
                      onClick={() => onNavigate(AppView.RESULTS)}
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HistoryLog;
