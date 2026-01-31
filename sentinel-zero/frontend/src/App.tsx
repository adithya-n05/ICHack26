import { Header } from './components/Header';
import { Globe } from './components/map/Globe';
import { Legend } from './components/map/Legend';
import { Sidebar } from './components/panels/Sidebar';
import { Timeline } from './components/timeline/Timeline';
import 'mapbox-gl/dist/mapbox-gl.css';

function App() {
  return (
    <div
      className="h-screen w-screen bg-[var(--bg-void)] overflow-hidden"
      style={{
        display: 'grid',
        gridTemplateRows: '48px 1fr 44px',
        gridTemplateColumns: '1fr 360px',
        gridTemplateAreas: `
          "header header"
          "map sidebar"
          "timeline timeline"
        `,
      }}
    >
      {/* Header */}
      <div style={{ gridArea: 'header' }}>
        <Header />
      </div>

      {/* Main Map Area */}
      <div style={{ gridArea: 'map' }} className="relative">
        <Globe />
        <Legend />
      </div>

      {/* Sidebar */}
      <div style={{ gridArea: 'sidebar' }}>
        <Sidebar />
      </div>

      {/* Timeline */}
      <div style={{ gridArea: 'timeline' }}>
        <Timeline />
      </div>
    </div>
  );
}

export default App;
