// syncWithSupabase.js
import { supabase } from "./supabaseClient";

// save tracker data to Supabase
export async function saveAttendanceData({ altarServers, records }) {
  try {
    // Upsert altar servers
    for (const server of altarServers) {
      await supabase
        .from("altar_servers")
        .upsert({ id: server.id, name: server.name, group_name: server.group });
    }

    // Upsert attendance records
    for (const [date, dayRecords] of Object.entries(records)) {
      for (const [server_id, status] of Object.entries(dayRecords)) {
        await supabase
          .from("attendance_records")
          .upsert({ server_id, date, status });
      }
    }
  } catch (error) {
    console.error("Supabase save error:", error);
  }
}

// load tracker data from Supabase
export async function loadAttendanceData() {
  try {
    const { data: servers, error: serversErr } = await supabase
      .from("altar_servers")
      .select("*");
    if (serversErr) throw serversErr;

    const { data: recordsData, error: recordsErr } = await supabase
      .from("attendance_records")
      .select("*");
    if (recordsErr) throw recordsErr;

    const altarServers = servers || [];
    const records = {};

    for (const rec of recordsData || []) {
      if (!records[rec.date]) records[rec.date] = {};
      records[rec.date][rec.server_id] = rec.status;
    }

    return { altarServers, records };
  } catch (error) {
    console.error("Supabase load error:", error);
    return { altarServers: [], records: {} };
  }
}
