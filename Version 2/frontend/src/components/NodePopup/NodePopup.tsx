interface NodePopupProps {
  node: { name: string; type?: string };
  x: number;
  y: number;
  onViewDetails: () => void;
  onViewAlternatives?: () => void;
  onClose: () => void;
}

export function NodePopup({
  node,
  x,
  y,
  onViewDetails,
  onViewAlternatives,
  onClose,
}: NodePopupProps) {
  return (
    <div
      className="absolute z-50 bg-bg-tertiary rounded border border-border p-3 shadow-lg min-w-[200px]"
      style={{
        left: x,
        top: y,
        transform: 'translate(-50%, -100%) translateY(-10px)',
      }}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-accent-cyan font-mono text-sm font-bold">
          {node.name}
        </span>
        <button
          onClick={onClose}
          className="text-text-secondary hover:text-text-primary ml-4 text-xs"
        >
          x
        </button>
      </div>
      <p className="text-text-secondary text-xs mb-3">
        {node.type || 'Unknown type'}
      </p>
      <div className="flex gap-2">
        <button
          onClick={onViewDetails}
          className="text-accent-cyan text-xs hover:underline"
        >
          Details →
        </button>
        {onViewAlternatives && (
          <button
            onClick={onViewAlternatives}
            className="text-accent-green text-xs hover:underline"
          >
            Alternatives
          </button>
        )}
      </div>
    </div>
  );
}
