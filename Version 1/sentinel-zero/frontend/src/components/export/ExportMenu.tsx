/**
 * ExportMenu - Dropdown menu for export options
 *
 * Provides PDF report, CSV data, and map screenshot export
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useStore } from '../../store';
import { generatePDFReport, exportCSV, captureMapScreenshot } from './exportUtils';

interface ExportMenuProps {
  mapRef?: React.RefObject<HTMLDivElement>;
}

export function ExportMenu({ mapRef }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Get data from store
  const nodes = useStore((state) => state.nodes);
  const routes = useStore((state) => state.routes);
  const riskZones = useStore((state) => state.riskZones);
  const alternatives = useStore((state) => state.alternatives);

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Export handlers
  const handlePDFExport = useCallback(async () => {
    setIsExporting('pdf');
    try {
      await generatePDFReport({ nodes, routes, riskZones, alternatives });
    } finally {
      setIsExporting(null);
      setIsOpen(false);
    }
  }, [nodes, routes, riskZones, alternatives]);

  const handleCSVExport = useCallback(() => {
    setIsExporting('csv');
    try {
      exportCSV({ nodes, routes, riskZones, alternatives });
    } finally {
      setIsExporting(null);
      setIsOpen(false);
    }
  }, [nodes, routes, riskZones, alternatives]);

  const handleScreenshot = useCallback(async () => {
    setIsExporting('screenshot');
    try {
      // Find the map container element
      const mapElement = mapRef?.current || document.querySelector('[data-map-container]') as HTMLElement;
      await captureMapScreenshot(mapElement);
    } finally {
      setIsExporting(null);
      setIsOpen(false);
    }
  }, [mapRef]);

  const exportOptions = [
    {
      id: 'pdf',
      label: 'PDF Report',
      description: 'Full risk assessment report',
      icon: '📄',
      action: handlePDFExport,
    },
    {
      id: 'csv',
      label: 'CSV Data',
      description: 'Export all supply chain data',
      icon: '📊',
      action: handleCSVExport,
    },
    {
      id: 'screenshot',
      label: 'Map Screenshot',
      description: 'Capture current map view',
      icon: '📷',
      action: handleScreenshot,
    },
  ];

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-default)] transition-all"
      >
        <span>Export</span>
        <svg
          className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-[var(--bg-raised)] border border-[var(--border-subtle)] rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="p-2">
            <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider px-2 py-1 mb-1">
              Export Options
            </div>
            {exportOptions.map((option) => (
              <button
                key={option.id}
                onClick={option.action}
                disabled={isExporting !== null}
                className="w-full flex items-start gap-3 px-3 py-2 rounded hover:bg-[var(--bg-surface)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-left"
              >
                <span className="text-base">{option.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[var(--text-primary)] flex items-center gap-2">
                    {option.label}
                    {isExporting === option.id && (
                      <span className="w-3 h-3 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                  <div className="text-[10px] text-[var(--text-tertiary)]">
                    {option.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="border-t border-[var(--border-subtle)] p-2">
            <div className="text-[10px] text-[var(--text-tertiary)] px-2">
              {nodes.length} nodes · {routes.length} routes · {riskZones.length} risk zones
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExportMenu;
