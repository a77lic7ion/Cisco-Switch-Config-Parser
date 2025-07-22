

import React from 'react';
import { AnalysisFinding } from '../types';

interface FindingCardProps {
  finding: AnalysisFinding;
}

const FindingCard: React.FC<FindingCardProps> = ({ finding }) => {
  const getSeverityStyles = (severity: string): { border: string; bg: string; text: string; titleText: string } => {
    switch (severity?.toLowerCase()) {
      case 'critical': return { border: 'border-red-600', bg: 'bg-red-900/40', text: 'text-red-300', titleText: 'text-red-400' };
      case 'high': return { border: 'border-red-500', bg: 'bg-red-900/30', text: 'text-red-300', titleText: 'text-red-400' };
      case 'medium': return { border: 'border-orange-500', bg: 'bg-orange-900/30', text: 'text-orange-300', titleText: 'text-orange-400' };
      case 'low': return { border: 'border-yellow-500', bg: 'bg-yellow-900/20', text: 'text-yellow-300', titleText: 'text-yellow-400' };
      default: return { border: 'border-sky-500', bg: 'bg-sky-900/20', text: 'text-sky-300', titleText: 'text-sky-400' };
    }
  };

  const getTypeBadgeStyles = (type: string): string => {
      switch (type?.toLowerCase()) {
        case 'conflict': return 'bg-red-500/80 text-white';
        case 'security risk': return 'bg-orange-500/80 text-white';
        case 'suggestion': return 'bg-sky-500/80 text-white';
        case 'best practice': return 'bg-green-500/80 text-white';
        default: return 'bg-gray-500/80 text-white';
      }
  }

  const styles = getSeverityStyles(finding.severity);

  return (
    <div className={`p-4 rounded-lg shadow-lg mb-4 border-l-4 ${styles.border} ${styles.bg}`}>
      <div className="flex justify-between items-start mb-2">
        <h3 className={`text-lg font-semibold ${styles.titleText}`}>
          {finding.description}
        </h3>
        <span className={`text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap ${getTypeBadgeStyles(finding.type)}`}>
            {finding.type}
        </span>
      </div>
      
      <div className="mb-3 text-sm flex flex-wrap gap-x-4 gap-y-1">
        <p className={`${styles.text}`}>
          <span className="font-medium text-dark-text">Severity:</span> {finding.severity}
        </p>
        <p className={`${styles.text}`}>
          <span className="font-medium text-dark-text">Devices:</span> {finding.devicesInvolved.join(', ')}
        </p>
      </div>

      {finding.details && (
        <div className={`text-sm ${styles.text} mb-3`}>
          <p className="font-medium text-dark-text mb-1">Details:</p>
          <pre className="p-2 bg-dark-background/70 rounded text-xs overflow-auto max-h-40 text-light-text border border-light-background">
            {typeof finding.details === 'string' 
              ? finding.details 
              : JSON.stringify(finding.details, null, 2)}
          </pre>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-white/10">
         <p className="font-medium text-dark-text mb-1 text-sm text-green-400">Recommendation:</p>
         <p className="text-sm text-green-200">{finding.recommendation}</p>
      </div>
    </div>
  );
};

export default FindingCard;
