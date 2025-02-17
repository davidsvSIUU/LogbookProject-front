import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://myjauxextjrucjpkskky.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15amF1eGV4dGpydWNqcGtza2t5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczOTc4NjY1NiwiZXhwIjoyMDU1MzYyNjU2fQ.YjWr3Zp3spPFo4PbRvzggo0zm0MNhXyB_NJepOuhhYY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
