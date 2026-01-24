import React, { useState } from 'react';

interface DuplicateGroup {
  groupId: string;
  references: any[];
  primaryId?: string;
}

interface DuplicateManagerProps {
  duplicateGroups: DuplicateGroup[];
  onMergeDuplicates: (groupId: string, selectedPrimaryId: string, idsToDelete: string[]) => void;
  onIgnoreGroup: (groupId: string) => void;
}

const DuplicateManager: React.FC<DuplicateManagerProps> = ({
  duplicateGroups,
  onMergeDuplicates,
  onIgnoreGroup
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [selectedPrimary, setSelectedPrimary] = useState<Record<string, string>>({});

  if (duplicateGroups.length === 0) {
    return null;
  }

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const handleMerge = (group: DuplicateGroup) => {
    const primaryId = selectedPrimary[group.groupId] || group.references[0].id;
    const idsToDelete = group.references
      .filter(r => r.id !== primaryId)
      .map(r => r.id);
    
    onMergeDuplicates(group.groupId, primaryId, idsToDelete);
  };

  return (
    <div style={{
      marginBottom: '24px',
      padding: '20px',
      backgroundColor: '#fff8e1',
      border: '2px solid #ff9800',
      borderRadius: '8px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '16px'
      }}>
        <span style={{
          fontSize: '24px'
        }}>🔄</span>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', color: '#e65100' }}>
            {duplicateGroups.length} Duplicate {duplicateGroups.length === 1 ? 'Group' : 'Groups'} Found
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#666' }}>
            Review and merge duplicate references to clean up your bibliography
          </p>
        </div>
      </div>

      {duplicateGroups.map((group, groupIndex) => {
        const isExpanded = expandedGroups.has(group.groupId);
        const selectedId = selectedPrimary[group.groupId] || group.references[0].id;

        return (
          <div
            key={group.groupId}
            style={{
              marginBottom: '16px',
              border: '1px solid #ffb74d',
              borderRadius: '8px',
              backgroundColor: 'white',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div
              onClick={() => toggleGroup(group.groupId)}
              style={{
                padding: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                backgroundColor: '#fff3e0'
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '14px', color: '#e65100', marginBottom: '4px' }}>
                  Duplicate Group #{groupIndex + 1} - {group.references.length} entries
                </div>
                <div style={{ fontSize: '13px', color: '#666' }}>
                  {group.references[0].original_title?.substring(0, 100)}...
                </div>
              </div>
              <span style={{ fontSize: '20px' }}>
                {isExpanded ? '▼' : '▶'}
              </span>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
              <div style={{ padding: '16px' }}>
                <p style={{
                  margin: '0 0 16px 0',
                  fontSize: '13px',
                  color: '#666',
                  fontStyle: 'italic'
                }}>
                  Select which version to keep (others will be removed):
                </p>

                {/* Comparison Grid */}
                <div style={{
                  display: 'grid',
                  gap: '12px',
                  marginBottom: '16px'
                }}>
                  {group.references.map((ref, idx) => (
                    <div
                      key={ref.id}
                      onClick={() => setSelectedPrimary(prev => ({
                        ...prev,
                        [group.groupId]: ref.id
                      }))}
                      style={{
                        padding: '16px',
                        border: selectedId === ref.id ? '3px solid #2196f3' : '1px solid #ddd',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        backgroundColor: selectedId === ref.id ? '#e3f2fd' : 'white',
                        transition: 'all 0.2s',
                        position: 'relative'
                      }}
                    >
                      {/* Selection Badge */}
                      {selectedId === ref.id && (
                        <div style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          backgroundColor: '#2196f3',
                          color: 'white',
                          padding: '4px 12px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 600
                        }}>
                          ✓ KEEP THIS
                        </div>
                      )}

                      {/* Reference Details */}
                      <div style={{ marginBottom: '8px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          backgroundColor: '#f5f5f5',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          marginBottom: '8px'
                        }}>
                          Version #{idx + 1}
                        </span>
                      </div>

                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Title:</div>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: '#333' }}>
                          {ref.original_title}
                        </div>
                      </div>

                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>Authors:</div>
                        <div style={{ fontSize: '13px', color: '#666' }}>
                          {ref.original_authors || 'N/A'}
                        </div>
                      </div>

                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr',
                        gap: '8px',
                        marginTop: '12px',
                        paddingTop: '12px',
                        borderTop: '1px solid #eee'
                      }}>
                        <div>
                          <div style={{ fontSize: '11px', color: '#999' }}>Year</div>
                          <div style={{ fontSize: '13px', fontWeight: 500 }}>{ref.original_year}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: '#999' }}>Key</div>
                          <div style={{ fontSize: '13px', fontWeight: 500 }}>{ref.bibtex_key}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '11px', color: '#999' }}>Confidence</div>
                          <div style={{ fontSize: '13px', fontWeight: 500 }}>
                            {ref.confidence_score}%
                          </div>
                        </div>
                      </div>

                      {ref.doi && (
                        <div style={{ marginTop: '8px', fontSize: '12px', color: '#1976d2' }}>
                          DOI: {ref.doi}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  justifyContent: 'flex-end',
                  paddingTop: '16px',
                  borderTop: '1px solid #eee'
                }}>
                  <button
                    onClick={() => onIgnoreGroup(group.groupId)}
                    style={{
                      padding: '10px 20px',
                      border: '1px solid #ddd',
                      borderRadius: '6px',
                      backgroundColor: 'white',
                      color: '#666',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f5f5f5';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'white';
                    }}
                  >
                    Keep Both (Not Duplicates)
                  </button>

                  <button
                    onClick={() => handleMerge(group)}
                    style={{
                      padding: '10px 24px',
                      border: 'none',
                      borderRadius: '6px',
                      backgroundColor: '#2196f3',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#1976d2';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#2196f3';
                    }}
                  >
                    Merge Duplicates ({group.references.length - 1} will be removed)
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default DuplicateManager;
