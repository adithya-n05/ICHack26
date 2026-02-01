import { MapContainer } from '@/components/map/MapContainer';
import { QueryPanel } from '@/components/panels/QueryPanel';
import { NewsPanel } from '@/components/panels/NewsPanel';
import { SupplierPanel } from '@/components/panels/SupplierPanel';
import { useAppStore } from '@/store';
import { motion, AnimatePresence } from 'framer-motion';

function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-30 h-14 bg-slate-900/80 backdrop-blur-md border-b border-slate-700/50">
      <div className="h-full px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">SC</span>
          </div>
          <div>
            <h1 className="text-white font-mono text-sm font-bold tracking-wider">
              SUPPLY CHAIN INTEL
            </h1>
            <p className="text-slate-500 text-[10px] font-mono">
              Geopolitical Risk Visualization
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-slate-400">LIVE</span>
          </div>
          <div className="text-slate-400 text-xs font-mono">
            {new Date().toLocaleString()}
          </div>
        </div>
      </div>
    </header>
  );
}

function StatusBar() {
  const { impactedRoutes, impactAnalysis } = useAppStore();

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-30 h-8 bg-slate-900/80 backdrop-blur-md border-t border-slate-700/50">
      <div className="h-full px-4 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Routes:</span>
            <span className="text-cyan-400">7 Active</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">Nodes:</span>
            <span className="text-green-400">12 Online</span>
          </div>
          {impactedRoutes.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-400">{impactedRoutes.length} Impacted</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {impactAnalysis && (
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Risk Level:</span>
              <span className={`font-bold ${impactAnalysis.riskLevel > 70 ? 'text-red-400' : 'text-amber-400'}`}>
                {impactAnalysis.riskLevel}%
              </span>
            </div>
          )}
          <div className="text-slate-600">
            Powered by Mapbox + Perplexity
          </div>
        </div>
      </div>
    </footer>
  );
}

function Sidebar({ side, children, isOpen, onToggle }: {
  side: 'left' | 'right';
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={`fixed top-14 bottom-8 ${side === 'left' ? 'left-0' : 'right-0'} z-20 flex`}>
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className={`absolute top-4 ${side === 'left' ? '-right-8' : '-left-8'}
                    w-8 h-12 bg-slate-800/90 backdrop-blur border border-slate-700
                    ${side === 'left' ? 'rounded-r-lg border-l-0' : 'rounded-l-lg border-r-0'}
                    text-slate-400 hover:text-white transition-colors z-10
                    flex items-center justify-center`}
      >
        {side === 'left' ? (isOpen ? '◀' : '▶') : (isOpen ? '▶' : '◀')}
      </button>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: side === 'left' ? -320 : 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: side === 'left' ? -320 : 320, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`w-80 h-full bg-slate-900/60 backdrop-blur-md
                        border-slate-700/50 overflow-y-auto
                        ${side === 'left' ? 'border-r' : 'border-l'}`}
          >
            <div className="p-4 space-y-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  const { leftPanelOpen, rightPanelOpen, toggleLeftPanel, toggleRightPanel } = useAppStore();

  return (
    <div className="w-full h-full bg-[#0a0a14] relative overflow-hidden">
      {/* Scan line effect */}
      <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden opacity-[0.03]">
        <div
          className="absolute w-full h-[2px] bg-cyan-400"
          style={{
            animation: 'scan-line 8s linear infinite',
          }}
        />
      </div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-40 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(34, 211, 238, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34, 211, 238, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Header */}
      <Header />

      {/* Map */}
      <div className="absolute inset-0 pt-14 pb-8">
        <MapContainer />
      </div>

      {/* Left Sidebar - Query & Impact */}
      <Sidebar side="left" isOpen={leftPanelOpen} onToggle={toggleLeftPanel}>
        <QueryPanel />
      </Sidebar>

      {/* Right Sidebar - News & Suppliers */}
      <Sidebar side="right" isOpen={rightPanelOpen} onToggle={toggleRightPanel}>
        <SupplierPanel />
        <NewsPanel />
      </Sidebar>

      {/* Status Bar */}
      <StatusBar />
    </div>
  );
}
