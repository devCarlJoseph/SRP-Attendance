// syncWithSupabase.js
import { supabase } from "./supabaseClient";

// Load servers and attendance records from normalized tables
export async function loadAttendanceData() {
  // Load altar servers
  const { data: altarServers, error: serversError } = await supabase
    .from("altar_servers")
    .select("*");
  if (serversError) console.error("Error loading servers:", serversError);

  // Load attendance records
  const { data: recordsData, error: recordsError } = await supabase
    .from("altar_servers")
    .select("*");
  if (recordsError) console.error("Error loading records:", recordsError);

  // Transform into { date: { serverId: status } }
  const records = {};
  (recordsData || []).forEach((r) => {
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
  // Save all altar servers
  for (const server of altarServers) {
    await supabase
      .from("altar_servers")
      .upsert({ id: server.id, name: server.name, group_name: server.group });
  }

  // Save all attendance records
  for (const date of Object.keys(records)) {
    const row = records[date];
    for (const serverId of Object.keys(row)) {
      await supabase
        .from("altar_servers")
        .upsert({ server_id: serverId, date, status: row[serverId] });
    }
  }
}
