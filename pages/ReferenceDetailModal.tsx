import React, { useState } from 'react';

interface MetadataMismatch {
  field: string;
  yourBibtex: string;
  canonical: string;
  isCritical?: boolean;
}

interface QuickFix {
  id: string;
  title: string;
  description: string;
  suggestion: string;
  icon: string;
  applied?: boolean;
}

interface ReferenceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  referenceId: string;
  title: string;
  issueType: 'warning' | 'error';
  mismatches: MetadataMismatch[];
  quickFixes: QuickFix[];
  onApplyFix: (fixId: string) => void;
  onUpdateReference: () => void;
  onIgnore: () => void;
}

const ReferenceDetailModal: React.FC<ReferenceDetailModalProps> = ({
  isOpen,
  onClose,
  referenceId,
  title,
  issueType,
  mismatches,
  quickFixes,
  onApplyFix,
  onUpdateReference,
  onIgnore,
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'differences' | 'suggestions' | 'history'>('differences');
  const [appliedFixes, setAppliedFixes] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const conflictCount = mismatches.filter(m => m.isCritical).length;

  const handleApplyFix = (fixId: string) => {
    setAppliedFixes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fixId)) {
        newSet.delete(fixId);
      } else {
        newSet.add(fixId);
      }
      return newSet;
    });
    onApplyFix(fixId);
  };

  const handleUpdate = () => {
    onUpdateReference();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-end">
      {/* Modal Panel */}
      <div className="w-full max-w-2xl h-full bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <span className="text-red-600 font-bold">✕</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Metadata mismatch</h2>
                <p className="text-sm text-gray-600">Reference ID: {referenceId}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-light"
            >
              ×
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
          <div className="flex gap-8">
            {(['summary', 'differences', 'suggestions', 'history'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'differences' && conflictCount > 0 && (
                  <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                    {conflictCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'differences' && (
            <div className="p-6">
              <h3 className="text-base font-bold text-gray-900 mb-6">Comparison</h3>

              {conflictCount > 0 && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                  {conflictCount} Conflict{conflictCount !== 1 ? 's' : ''} Found
                </div>
              )}

              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="grid grid-cols-3 bg-gray-50 border-b border-gray-200">
                  <div className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider">Field</div>
                  <div className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    Your BibTeX
                  </div>
                  <div className="px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    Canonical
                  </div>
                </div>

                <div className="divide-y divide-gray-200">
                  {mismatches.map((mismatch, idx) => (
                    <div key={idx} className="grid grid-cols-3 hover:bg-gray-50 transition-colors">
                      <div className="px-4 py-4 text-sm font-medium text-gray-900 bg-gray-50">
                        {mismatch.field}
                      </div>
                      <div className="px-4 py-4 text-sm text-red-700 bg-red-50 font-mono">
                        {mismatch.yourBibtex || '—'}
                      </div>
                      <div className="px-4 py-4 text-sm text-green-700 bg-green-50 font-mono">
                        {mismatch.canonical}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'suggestions' && (
            <div className="p-6">
              <h3 className="text-base font-bold text-gray-900 mb-6">Quick Fixes</h3>

              <div className="space-y-3">
                {quickFixes.map((fix) => (
                  <div
                    key={fix.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-1">
                          <span className="text-sm">{fix.icon}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{fix.title}</p>
                          <p className="text-sm text-gray-600 mt-1">{fix.description}</p>
                          {fix.suggestion && (
                            <p className="text-sm font-mono text-gray-700 mt-2 bg-gray-50 p-2 rounded border border-gray-200">
                              {fix.suggestion}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleApplyFix(fix.id)}
                        className={`ml-3 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                          appliedFixes.has(fix.id)
                            ? 'bg-green-100 text-green-700 border border-green-300'
                            : 'bg-white text-blue-600 border border-gray-300 hover:border-blue-300 hover:bg-blue-50'
                        }`}
                      >
                        {appliedFixes.has(fix.id) ? '✓ Applied' : 'Apply'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'summary' && (
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Reference Title</p>
                  <p className="text-gray-900 font-medium mt-2">{title}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Status</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      issueType === 'error'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {issueType === 'error' ? 'Critical Issue' : 'Warning'}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Issues Found</p>
                  <p className="text-gray-900 mt-2">{mismatches.length} metadata field(s) mismatch</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="p-6">
              <div className="text-center py-12">
                <p className="text-gray-500 text-sm">No previous updates for this reference</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-gray-200 bg-gray-50 p-6 flex gap-3 justify-end">
          <button
            onClick={onIgnore}
            className="px-6 py-2.5 text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors"
          >
            Ignore Warning
          </button>
          <button
            onClick={handleUpdate}
            className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <span>✓</span>
            Update Reference
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReferenceDetailModal;
