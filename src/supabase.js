import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://jfayqffmmkwjrbdanqsm.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpmYXlxZmZtbWt3anJiZGFucXNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzMDU0OTQsImV4cCI6MjA4ODg4MTQ5NH0.IM4xu2MRouTAe5DkzWyBtPtekW7J2o6-aKej2vXBeBU'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
