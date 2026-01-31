import { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary p-8">
      <h1 className="text-3xl font-bold mb-4 text-accent-cyan">
        Sentinel Zero
      </h1>
      <div className="bg-bg-secondary p-4 rounded-lg border border-border">
        <button
          onClick={() => setCount((count) => count + 1)}
          className="bg-accent-cyan hover:bg-accent-cyan/80 text-bg-primary px-4 py-2 rounded font-medium"
        >
          count is {count}
        </button>
        <p className="mt-4 text-text-secondary">
          Dark theme with custom colors!
        </p>
      </div>
    </div>
  );
}

export default App;
