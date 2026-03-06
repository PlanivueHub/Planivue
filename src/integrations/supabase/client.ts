import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://qcgyshddmgwptcnltxkv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjZ3lzaGRkbWd3cHRjbmx0eGt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MDc2NzcsImV4cCI6MjA4ODM4MzY3N30.cl3V7j6M8iOU6UKOEcvOOXuT-K62O1HKkEtBx8ECNMs";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
