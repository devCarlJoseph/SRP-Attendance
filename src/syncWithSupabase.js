// supabaseClient.js
import { createClient } from "@supabase/supabase-js";

// replace with your Supabase project URL & anon key
const SUPABASE_URL = "https://ecwefjruggdvnffnlfex.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjd2VmanJ1Z2dkdm5mZm5sZmV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5NzY0MjMsImV4cCI6MjA3NDU1MjQyM30.q46Q-2F9H1LB0e87GM6VN6bMbensf5NDMS0geYakwtM";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Load servers and attendance records
export async function loadAttendanceData() {
  const { data: altarServers, error: serversError } = await supabase
    .from("altar_servers")
    .select("*");
  if (serversError) console.error("Error loading servers:", serversError);

  const { data: attendanceRows, error: recordsError } = await supabase
    .from("attendance_records")
    .select("*");
  if (recordsError) console.error("Error loading records:", recordsError);

  // Transform rows to nested object { date: { server_id: status } }
  const records = {};
  (attendanceRows || []).forEach((row) => {
    if (!records[row.date]) records[row.date] = {};
    records[row.date][row.server_id] = row.status;
  });

  return { altarServers: altarServers || [], records };
}

// Save attendance to Supabase
export async function saveAttendanceData({ altarServers, records }) {
  // Save servers
  for (const s of altarServers) {
    const { error } = await supabase
      .from("altar_servers")
      .upsert([{ id: s.id, name: s.name, group_name: s.group }]);
    if (error) console.error("Error saving server:", error);
  }

  // Save attendance records
  for (const d of Object.keys(records)) {
    for (const server_id of Object.keys(records[d])) {
      const status = records[d][server_id];
      const { error } = await supabase
        .from("attendance_records")
        .upsert([{ server_id, date: d, status }]);
      if (error) console.error("Error saving attendance record:", error);
    }
  }
}
