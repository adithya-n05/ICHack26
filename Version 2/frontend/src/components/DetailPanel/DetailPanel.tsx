interface DetailPanelProps {
  selectedNode: {
    name: string;
    type?: string;
    city?: string;
    country?: string;
  } | null;
  onClose: () => void;
}

export function DetailPanel({ selectedNode, onClose }: DetailPanelProps) {
  if (!selectedNode) return null;

  return (
    <aside className="absolute right-0 top-10 w-[350px] h-[calc(100vh-40px)] bg-bg-secondary border-l border-border p-4 overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-accent-cyan font-mono text-lg">{selectedNode.name}</h2>
        <button
          onClick={onClose}
          className="text-text-secondary hover:text-text-primary"
        >
          x
        </button>
      </div>

      <section className="mb-4">
        <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase">
          Location
        </h3>
        <p className="text-text-primary text-sm">
          {selectedNode.city && selectedNode.country
            ? `${selectedNode.city}, ${selectedNode.country}`
            : 'Unknown'}
        </p>
      </section>

      <section className="mb-4">
        <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase">
          Type
        </h3>
        <p className="text-text-primary text-sm">
          {selectedNode.type || 'Unknown'}
        </p>
      </section>

      <section className="mb-4">
        <h3 className="text-text-secondary text-xs font-mono mb-2 uppercase">
          Risk Status
        </h3>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-accent-green"></span>
          <span className="text-text-primary text-sm">Healthy</span>
        </div>
      </section>
    </aside>
  );
}
