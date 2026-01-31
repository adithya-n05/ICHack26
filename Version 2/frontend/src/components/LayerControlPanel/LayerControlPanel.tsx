import { useState } from 'react';

interface LayerControlPanelProps {
  onLayerChange?: (layers: Record<string, boolean>) => void;
}

export function LayerControlPanel({ onLayerChange }: LayerControlPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [layers, setLayers] = useState({
    nodes: true,
    arcs: true,
    heatmaps: true,
    tariffs: true,
  });

  const toggleLayer = (layer: string) => {
    const newLayers = {
      ...layers,
      [layer]: !layers[layer as keyof typeof layers],
    };
    setLayers(newLayers);
    onLayerChange?.(newLayers);
  };

  return (
    <div
      className={`absolute left-0 top-10 ${isCollapsed ? 'w-12' : 'w-48'} h-[calc(100vh-40px)] bg-bg-secondary border-r border-border p-2 transition-all duration-200`}
    >
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="text-text-primary hover:text-accent-cyan mb-4 w-full text-left font-mono"
      >
        {isCollapsed ? '>' : '<'}
      </button>
      {!isCollapsed && (
        <>
          <h3 className="text-text-primary font-mono text-sm mb-4">LAYERS</h3>
          {Object.entries(layers).map(([key, value]) => (
            <label
              key={key}
              className="flex items-center gap-2 mb-2 text-text-primary text-sm cursor-pointer"
            >
              <input
                type="checkbox"
                checked={value}
                onChange={() => toggleLayer(key)}
                className="accent-accent-cyan"
              />
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </label>
          ))}
        </>
      )}
    </div>
  );
}
