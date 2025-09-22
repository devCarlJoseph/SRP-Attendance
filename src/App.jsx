import React, { useEffect, useState } from "react";

const STORAGE_KEY = "attendance_tracker_v1";

function formatDateISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function AttendanceTracker() {
  const [altarServers, setAltarServers] = useState([]);
  const [nameInput, setNameInput] = useState("");
  const [date, setDate] = useState(formatDateISO(new Date()));
  const [records, setRecords] = useState({});
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setAltarServers(parsed.altarServers || []);
        setRecords(parsed.records || {});
      }
    } catch (e) {
      console.error("Failed to load attendance from storage", e);
    }
  }, []);

  useEffect(() => {
    const payload = { altarServers, records };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [altarServers, records]);

  const addAltarServer = (e) => {
    e?.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    const id = Date.now().toString();
    setAltarServers((s) => [...s, { id, name: trimmed }]);
    setNameInput("");
  };

  const removeAltarServer = (id) => {
    setAltarServers((s) => s.filter((x) => x.id !== id));
    setRecords((r) => {
      const copy = { ...r };
      for (const d of Object.keys(copy)) {
        if (copy[d] && copy[d][id]) {
          const rec = { ...copy[d] };
          delete rec[id];
          copy[d] = rec;
        }
      }
      return copy;
    });
  };

  const markAll = (status) => {
    setRecords((r) => {
      const row = {};
      altarServers.forEach((s) => (row[s.id] = status));
      return { ...r, [date]: row };
    });
  };

  const clearDate = () => {
    setRecords((r) => {
      const copy = { ...r };
      delete copy[date];
      return copy;
    });
  };

  const attendanceSummaryForAltarServer = (altarServerId) => {
    let present = 0,
      absent = 0,
      late = 0,
      total = 0;
    for (const d of Object.keys(records)) {
      const val = records[d][altarServerId];
      if (val === "present") present++;
      if (val === "absent") absent++;
      if (val === "late") late++;
      if (val === "present" || val === "absent" || val === "late") total++;
    }
    return { present, absent, late, total };
  };

  const filteredAltarServers = altarServers.filter((s) => {
    if (filter === "all") return true;
    const val = records[date] && records[date][s.id];
    if (filter === "present") return val === "present";
    if (filter === "late") return val === "late";
    if (filter === "absent") return val === "absent" || !val;
    return true;
  });

  return (
    <div className="h-screen flex justify-center items-center">
      <div>
        <div className="max-w-5xl mx-auto p-6 bg-[#07325c] rounded-[0.5rem]">
          <header className="mb-6">
            <h1 className="text-2xl font-bold mb-1 text-white">SRP Altar Servers Attendance</h1>
          </header>

          <section className="bg-white rounded-lg shadow p-4 mb-6">
            <form onSubmit={addAltarServer} className="flex gap-2">
              <input
                className="flex-1 border rounded px-3 py-2"
                placeholder="Add Altar Server Full Name and Press Enter"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
              />
              <button className="px-4 py-2 rounded bg-blue-900 text-white cursor-pointer hover:bg-blue-700" onClick={addAltarServer}>
                Add
              </button>
            </form>

            <div className="mt-4 flex gap-2 flex-wrap">
              <button className="px-3 py-1 rounded border cursor-pointer bg-blue-900 text-[white] hover:bg-blue-700" onClick={() => setAltarServers([])} title="Remove all altar servers">
                Remove all
              </button>
            </div>
          </section>

          <section className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <label className="block text-sm font-medium">Date</label>
              <input type="date" className="mt-1 p-2 border rounded w-full" value={date} onChange={(e) => setDate(e.target.value)} />

              <div className="mt-4 flex gap-2">
                <button className="px-3 py-1 rounded border bg-[#30b017] text-white cursor-pointer hover:bg-[#48de2a]" onClick={() => markAll("present")}>Mark all Present</button>
                <button className="px-3 py-1 rounded border bg-[#e63c3c] text-white cursor-pointer hover:bg-[#f56464]" onClick={() => markAll("absent")}>Mark all Absent</button>
                <button className="px-3 py-1 rounded border bg-[#4f4d4a] text-white cursor-pointer hover:bg-[#787775]" onClick={clearDate}>Clear Date</button>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium">Filter</label>
                <select className="mt-1 p-2 border rounded w-full" value={filter} onChange={(e) => setFilter(e.target.value)}>
                  <option value="all">All</option>
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="late">Late</option>
                </select>
              </div>
            </div>

            <div className="md:col-span-2 bg-white rounded-lg shadow p-4">
              <h2 className="font-semibold mb-2">Altar Servers ({altarServers.length})</h2>
              <div className="overflow-auto">
                <table className="min-w-full text-left">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2">Name</th>
                      <th className="py-2">Status ({date})</th>
                      <th className="py-2">Summary</th>
                      <th className="py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAltarServers.map((s) => {
                      const val = records[date] && records[date][s.id];
                      return (
                        <tr key={s.id} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-2">{s.name}</td>
                          <td className="py-2">
                            <div className="inline-flex gap-2">
                              <button className={`px-2 py-1 rounded border hover:bg-green-100 cursor-pointer ${val === "present" ? "bg-green-100" : ""}`} onClick={() => setRecords((r) => ({ ...r, [date]: { ...(r[date] || {}), [s.id]: "present" } }))}>
                                Present
                              </button>
                              <button className={`px-2 py-1 rounded border hover:bg-red-100 cursor-pointer  ${val === "absent" ? "bg-red-100" : ""}`} onClick={() => setRecords((r) => ({ ...r, [date]: { ...(r[date] || {}), [s.id]: "absent" } }))}>
                                Absent
                              </button>
                              <button className={`px-2 py-1 rounded border hover:bg-yellow-100 cursor-pointer  ${val === "late" ? "bg-yellow-100" : ""}`} onClick={() => setRecords((r) => ({ ...r, [date]: { ...(r[date] || {}), [s.id]: "late" } }))}>
                                Late
                              </button>
                            </div>
                          </td>
                          <td className="py-2 pl-2">
                            {(() => {
                              const sum = attendanceSummaryForAltarServer(s.id);
                              return (
                                <div className="text-sm text-gray-700">{sum.present} Present • {sum.absent} Absent • {sum.late} Late • {sum.total} Recorded</div>
                              );
                            })()}
                          </td>
                          <td className="py-2">
                            <button className="px-2 py-1 rounded border text-sm cursor-pointer bg-blue-900 text-white hover:bg-blue-600" onClick={() => removeAltarServer(s.id)}>Remove</button>
                          </td>
                        </tr>
                      );
                    })}
                    {altarServers.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-gray-500">No Altar Servers yet. Add one above.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <footer className="text-sm text-white mt-6">
            SAN ROQUE PARISH ALTAR SERVERS ATTENDANCE
          </footer>
        </div>
      </div>
    </div>
  );
}
