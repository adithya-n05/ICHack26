type HeatmapPopupContent = {
  label: string;
  radiusKm: number;
  count: number;
  topTypesText: string;
  dateText: string;
  locationText: string;
};

export const buildHeatmapPopupHtml = ({
  label,
  radiusKm,
  count,
  topTypesText,
  dateText,
  locationText,
}: HeatmapPopupContent) =>
  `<div style="font-family: monospace; font-size: 12px;">
    <div style="font-weight: 700; margin-bottom: 4px;">${label}</div>
    <div>Radius: ${Math.round(radiusKm)} km</div>
    <div>Events: ${count}</div>
    <div>Top types (count): ${topTypesText}</div>
    <div>Date range: ${dateText}</div>
    <div>Location: ${locationText}</div>
  </div>`;
