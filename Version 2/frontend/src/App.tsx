import { useState } from 'react';
import { Header } from './components/Header';
import { LayerControlPanel } from './components/LayerControlPanel';
import { DetailPanel } from './components/DetailPanel';
import { NewsTicker } from './components/NewsTicker';
import { NodePopup } from './components/NodePopup';
import { SupplierForm } from './components/SupplierForm';

// Demo data
const demoNewsItems = [
  { id: '1', title: 'Taiwan earthquake affects TSMC production', source: 'Reuters', category: 'disaster' as const },
  { id: '2', title: 'US-China tariffs increased on semiconductors', source: 'Bloomberg', category: 'trade' as const },
  { id: '3', title: 'Samsung announces new fab in Texas', source: 'WSJ', category: 'industry' as const },
  { id: '4', title: 'Port of Shanghai reports delays', source: 'SCMP', category: 'infrastructure' as const },
];

const demoNode = {
  id: "demo",
  name: "Demo Company",
  type: "HQ",
  city: "Paris",
  country: "France",
  location: { lat: 48.8566, lng: 2.3522 },
};


function App() {
  const [showDetail, setShowDetail] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="h-screen bg-bg-primary overflow-hidden">
      <Header />

      <LayerControlPanel onLayerChange={(layers) => console.log('Layers:', layers)} />

      {/* Main content area */}
      <div className="absolute left-48 top-10 right-0 bottom-12 p-4">
        <h2 className="text-text-primary font-mono mb-4">UI Components Demo</h2>

        <div className="flex gap-4 mb-4">
          <button
            onClick={() => setShowDetail(!showDetail)}
            className="px-4 py-2 bg-accent-cyan text-bg-primary rounded font-mono text-sm"
          >
            Toggle Detail Panel
          </button>
          <button
            onClick={() => setShowPopup(!showPopup)}
            className="px-4 py-2 bg-accent-green text-bg-primary rounded font-mono text-sm"
          >
            Toggle Node Popup
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-accent-orange text-bg-primary rounded font-mono text-sm"
          >
            Toggle Supplier Form
          </button>
        </div>

        {showForm && (
          <div className="mt-4">
            <SupplierForm onSubmit={(data) => console.log('Form submitted:', data)} />
          </div>
        )}
      </div>

      {showPopup && (
        <NodePopup
          node={demoNode}
          x={400}
          y={300}
          onViewDetails={() => {
            setShowPopup(false);
            setShowDetail(true);
          }}
          onViewAlternatives={() => console.log('View alternatives')}
          onClose={() => setShowPopup(false)}
        />
      )}

      {showDetail && (
        <DetailPanel
        selectedNode={demoNode}
        selectedConnection={null}
        onClose={() => setShowDetail(false)}
        />
      )}

      <NewsTicker items={demoNewsItems} />
    </div>
  );
}

export default App;
