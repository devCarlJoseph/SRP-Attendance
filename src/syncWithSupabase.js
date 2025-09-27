// supabaseClient.js
import { createClient } from "@supabase/supabase-js";

// replace with your Supabase project URL & anon key
const SUPABASE_URL = "https://ecwefjruggdvnffnlfex.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjd2VmanJ1Z2dkdm5mZm5sZmV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5NzY0MjMsImV4cCI6MjA3NDU1MjQyM30.q46Q-2F9H1LB0e87GM6VN6bMbensf5NDMS0geYakwtM";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ATTENDANCE_ID = 1; // single row to persist all data

export async function loadAttendanceData() {
  const { data, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("id", ATTENDANCE_ID)
    .single();

  if (error) {
    console.error("Error loading attendance data:", error);
    return { altarServers: [], records: {} };
  }

  return {
    altarServers: data?.altarServers || [],
    records: data?.records || {},
  };
}

export async function saveAttendanceData({ altarServers, records }) {
  const { error } = await supabase.from("attendance").upsert({
    id: ATTENDANCE_ID,
    altarServers,
    records,
  });

  if (error) console.error("Error saving attendance data:", error);
}