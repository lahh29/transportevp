import { createClient } from '@supabase/supabase-js';

// We need to read the env variables. Since we are in node, let's grab them from .env if possible, or just read the .env file.
import fs from 'fs';
import path from 'path';

const envFile = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
const SUPABASE_URL = envFile.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const SUPABASE_ANON_KEY = envFile.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('empleados').select('*').eq('numero_empleado', '1102');
  console.log("Data for 1102:", data);
  if (error) console.error("Error:", error);
}

check();
