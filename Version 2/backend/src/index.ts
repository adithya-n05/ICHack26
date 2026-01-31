import express from 'express';
import cors from 'cors';
import { supabase } from './lib/supabase';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/health', async (req, res) => {
  try {
    // Simple query to verify connection
    const { error } = await supabase.from('_health_check').select('*').limit(1);
    res.json({
      status: 'ok',
      db: error ? 'disconnected' : 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.json({
      status: 'ok',
      db: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
