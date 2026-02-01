/**
 * Export Utilities for Sentinel-Zero
 *
 * Following Context7 jsPDF best practices:
 * - Proper font styling
 * - Table generation with autoTable
 * - Document formatting
 */

import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';
import type { SupplyNode, SupplyRoute, RiskZone, AlternativeSupplier } from '../../types';

// Extend jsPDF type for autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: AutoTableOptions) => jsPDF;
    lastAutoTable: { finalY: number };
  }
}

interface AutoTableOptions {
  head?: string[][];
  body?: (string | number)[][];
  startY?: number;
  margin?: { left?: number; right?: number };
  styles?: Record<string, unknown>;
  headStyles?: Record<string, unknown>;
  theme?: string;
}

interface ExportData {
  nodes: SupplyNode[];
  routes: SupplyRoute[];
  riskZones: RiskZone[];
  alternatives: AlternativeSupplier[];
}

/**
 * Generate PDF Risk Assessment Report
 * Following Context7 jsPDF patterns for text styling and tables
 */
export async function generatePDFReport(data: ExportData): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Title
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Sentinel-Zero', pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(16);
  doc.setFont('helvetica', 'normal');
  doc.text('Supply Chain Risk Assessment Report', pageWidth / 2, 30, { align: 'center' });

  // Date
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 38, { align: 'center' });

  // Summary Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', 14, 50);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const criticalRoutes = data.routes.filter(r => r.riskScore >= 70);
  const atRiskRoutes = data.routes.filter(r => r.riskScore >= 50 && r.riskScore < 70);
  const avgRisk = data.routes.reduce((sum, r) => sum + r.riskScore, 0) / data.routes.length || 0;

  const summaryLines = [
    `Total Supply Chain Nodes: ${data.nodes.length}`,
    `Active Routes: ${data.routes.length}`,
    `Critical Risk Routes: ${criticalRoutes.length}`,
    `At-Risk Routes: ${atRiskRoutes.length}`,
    `Average Route Risk Score: ${avgRisk.toFixed(1)}%`,
    `Active Risk Zones: ${data.riskZones.length}`,
    `Alternative Suppliers Available: ${data.alternatives.length}`,
  ];

  let yPos = 58;
  summaryLines.forEach(line => {
    doc.text(line, 14, yPos);
    yPos += 6;
  });

  // Risk Zones Table
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Active Risk Zones', 14, yPos + 10);

  const riskZoneHead = [['Name', 'Type', 'Intensity', 'Description']];
  const riskZoneBody = data.riskZones.map(zone => [
    zone.name,
    zone.type.charAt(0).toUpperCase() + zone.type.slice(1),
    `${(zone.intensity * 100).toFixed(0)}%`,
    zone.description.substring(0, 50) + (zone.description.length > 50 ? '...' : ''),
  ]);

  doc.autoTable({
    head: riskZoneHead,
    body: riskZoneBody,
    startY: yPos + 15,
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8 },
    headStyles: { fillColor: [220, 38, 38] },
  });

  // Routes Table
  doc.addPage();
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Supply Routes Analysis', 14, 20);

  const routeHead = [['Route', 'Mode', 'Status', 'Risk Score', 'Est. Days']];
  const routeBody = data.routes.map(route => [
    route.name,
    route.transportMode.toUpperCase(),
    route.status.toUpperCase(),
    `${route.riskScore}%`,
    route.estimatedDays.toString(),
  ]);

  doc.autoTable({
    head: routeHead,
    body: routeBody,
    startY: 25,
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8 },
    headStyles: { fillColor: [0, 122, 255] },
  });

  // Nodes Table
  const nodesStartY = doc.lastAutoTable.finalY + 15;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Supply Chain Nodes', 14, nodesStartY);

  const nodeHead = [['Name', 'Type', 'Country', 'Risk Score', 'Company']];
  const nodeBody = data.nodes.map(node => [
    node.name,
    node.type.toUpperCase(),
    node.country,
    `${node.riskScore}%`,
    node.metadata.company || '-',
  ]);

  doc.autoTable({
    head: nodeHead,
    body: nodeBody,
    startY: nodesStartY + 5,
    margin: { left: 14, right: 14 },
    styles: { fontSize: 8 },
    headStyles: { fillColor: [0, 200, 150] },
  });

  // Alternative Suppliers
  if (data.alternatives.length > 0) {
    doc.addPage();
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Recommended Alternative Suppliers', 14, 20);

    const altHead = [['Rank', 'Name', 'Country', 'Risk', 'Cost Delta', 'Lead Time', 'Capacity']];
    const altBody = data.alternatives.map(alt => [
      `#${alt.rank}`,
      alt.name,
      alt.country,
      `${alt.riskScore}%`,
      `+${alt.costDelta}%`,
      `${alt.leadTimeDays} days`,
      `${alt.capacity}%`,
    ]);

    doc.autoTable({
      head: altHead,
      body: altBody,
      startY: 25,
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8 },
      headStyles: { fillColor: [34, 197, 94] },
    });
  }

  // Footer
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Sentinel-Zero | Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Save
  doc.save(`sentinel-zero-report-${formatDate(new Date())}.pdf`);
}

/**
 * Export supply chain data as CSV
 */
export function exportCSV(data: ExportData): void {
  const lines: string[] = [];

  // Nodes section
  lines.push('SUPPLY CHAIN NODES');
  lines.push('ID,Name,Type,Country,Code,Risk Score,Company,Products,Capacity,Lead Time,Unit Cost,Longitude,Latitude');
  data.nodes.forEach(node => {
    lines.push([
      node.id,
      `"${node.name}"`,
      node.type,
      `"${node.country}"`,
      node.countryCode,
      node.riskScore,
      `"${node.metadata.company || ''}"`,
      `"${(node.metadata.products || []).join('; ')}"`,
      node.metadata.capacity || '',
      node.metadata.leadTime || '',
      node.metadata.unitCost || '',
      node.coordinates[0],
      node.coordinates[1],
    ].join(','));
  });

  lines.push('');

  // Routes section
  lines.push('SUPPLY ROUTES');
  lines.push('ID,Name,Source,Destination,Transport Mode,Status,Risk Score,Est. Days');
  data.routes.forEach(route => {
    lines.push([
      route.id,
      `"${route.name}"`,
      route.sourceId,
      route.destinationId,
      route.transportMode,
      route.status,
      route.riskScore,
      route.estimatedDays,
    ].join(','));
  });

  lines.push('');

  // Risk zones section
  lines.push('RISK ZONES');
  lines.push('ID,Name,Type,Intensity,Radius (km),Description,Longitude,Latitude');
  data.riskZones.forEach(zone => {
    lines.push([
      zone.id,
      `"${zone.name}"`,
      zone.type,
      zone.intensity,
      zone.radius,
      `"${zone.description}"`,
      zone.coordinates[0],
      zone.coordinates[1],
    ].join(','));
  });

  lines.push('');

  // Alternatives section
  lines.push('ALTERNATIVE SUPPLIERS');
  lines.push('ID,Rank,Name,Country,Risk Score,Cost Delta %,Lead Time Days,Capacity %,Longitude,Latitude');
  data.alternatives.forEach(alt => {
    lines.push([
      alt.id,
      alt.rank,
      `"${alt.name}"`,
      `"${alt.country}"`,
      alt.riskScore,
      alt.costDelta,
      alt.leadTimeDays,
      alt.capacity,
      alt.coordinates[0],
      alt.coordinates[1],
    ].join(','));
  });

  // Download
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `sentinel-zero-data-${formatDate(new Date())}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Capture map screenshot using html2canvas
 */
export async function captureMapScreenshot(mapElement: HTMLElement | null): Promise<void> {
  if (!mapElement) {
    console.error('Map element not found');
    return;
  }

  try {
    const canvas = await html2canvas(mapElement, {
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#0a0c10',
      scale: 2, // Higher resolution
    });

    // Convert to blob and download
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sentinel-zero-map-${formatDate(new Date())}.png`;
      link.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  } catch (error) {
    console.error('Screenshot capture failed:', error);
  }
}

/**
 * Export simulation results as JSON
 */
export function exportSimulationJSON(
  query: string,
  results: {
    affectedRoutes: string[];
    riskChanges: Record<string, number>;
    recommendations: string[];
  }
): void {
  const exportData = {
    timestamp: new Date().toISOString(),
    query,
    results,
    metadata: {
      generator: 'Sentinel-Zero',
      version: '1.0.0',
    },
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `sentinel-zero-simulation-${formatDate(new Date())}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

// Helper function to format date for filenames
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
