// syncWithSupabase.js
import { supabase } from "./supabaseClient";

// Load servers and attendance records
export async function loadAttendanceData() {
  const { data: altarServers, error: serversError } = await supabase
    .from("altar_servers")
    .select("*");
  if (serversError) console.error("Error loading servers:", serversError);

  const { data: attendanceData, error: recordsError } = await supabase
    .from("attendance_records")
    .select("*");
  if (recordsError) console.error("Error loading records:", recordsError);

  const records = {};
  (attendanceData || []).forEach((r) => {
    if (!records[r.date]) records[r.date] = {};
    records[r.date][r.server_id] = r.status;
  });

  return {
    altarServers: altarServers || [],
    records,
  };
}

// Save all servers and attendance records
export async function saveAttendanceData({ altarServers, records }) {
  for (const server of altarServers) {
    await supabase
      .from("altar_servers")
      .upsert({ id: server.id, name: server.name, group_name: server.group });
  }

  for (const date of Object.keys(records)) {
    const row = records[date];
    for (const serverId of Object.keys(row)) {
      await supabase
        .from("attendance_records")
        .upsert({ server_id: serverId, date, status: row[serverId] });
    }
  }
}
