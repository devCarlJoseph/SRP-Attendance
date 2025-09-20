import React, { useEffect, useState } from "react";

// AttendanceTracker.jsx
// Single-file React component (Tailwind CSS classes used)
// Features:
// - Add / remove students
// - Select date and mark Present / Absent (and toggle)
// - Persist data to localStorage
// - View per-date attendance and per-student summary
// - Export selected date as CSV
// How to use:
// - Drop this component into a React app that has Tailwind configured.
// - Example: Create a new Vite + React project, install Tailwind, and render <AttendanceTracker /> in App.jsx.

const STORAGE_KEY = "attendance_tracker_v1";

function formatDateISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function AttendanceTracker() {
  const [students, setStudents] = useState([]); // [{id, name}]
  const [nameInput, setNameInput] = useState("");
  const [date, setDate] = useState(formatDateISO(new Date()));
  const [records, setRecords] = useState({}); // {dateISO: {studentId: 'present'|'absent'}}
  const [filter, setFilter] = useState("all");

  // load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setStudents(parsed.students || []);
        setRecords(parsed.records || {});
      }
    } catch (e) {
      console.error("Failed to load attendance from storage", e);
    }
  }, []);

  // save to localStorage
  useEffect(() => {
    const payload = { students, records };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [students, records]);

  const addStudent = (e) => {
    e?.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    const id = Date.now().toString();
    setStudents((s) => [...s, { id, name: trimmed }]);
    setNameInput("");
  };

  const removeStudent = (id) => {
    setStudents((s) => s.filter((x) => x.id !== id));
    // also remove attendance entries for this student
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

  const toggleAttendance = (studentId) => {
    setRecords((r) => {
      const forDate = { ...(r[date] || {}) };
      const cur = forDate[studentId];
      // cycle: undefined -> present -> absent -> undefined
      const next = cur === "present" ? "absent" : cur === "absent" ? undefined : "present";
      if (next === undefined) delete forDate[studentId];
      else forDate[studentId] = next;
      return { ...r, [date]: forDate };
    });
  };

  const markAll = (status) => {
    setRecords((r) => {
      const row = {};
      students.forEach((s) => (row[s.id] = status));
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

  const exportCSV = () => {
    const header = ["Student Name", "Status", "Date"];
    const rows = students.map((s) => {
      const status = (records[date] && records[date][s.id]) || "absent";
      return [s.name, status, date];
    });
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_${date}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const attendanceSummaryForStudent = (studentId) => {
    let present = 0,
      absent = 0,
      total = 0;
    for (const d of Object.keys(records)) {
      const val = records[d][studentId];
      if (val === "present") present++;
      if (val === "absent") absent++;
      if (val === "present" || val === "absent") total++;
    }
    return { present, absent, total };
  };

  const filteredStudents = students.filter((s) => {
    if (filter === "all") return true;
    const val = records[date] && records[date][s.id];
    if (filter === "present") return val === "present";
    if (filter === "absent") return val === "absent" || !val; // treat undefined as absent
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Attendance Tracker</h1>
        <p className="text-sm text-gray-600">Simple, local-first attendance web app (persists to browser). Export CSV for records.</p>
      </header>

      <section className="bg-white rounded-lg shadow p-4 mb-6">
        <form onSubmit={addStudent} className="flex gap-2">
          <input
            className="flex-1 border rounded px-3 py-2"
            placeholder="Add student name and press Enter"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
          />
          <button className="px-4 py-2 rounded bg-blue-600 text-white" onClick={addStudent}>
            Add
          </button>
        </form>

        <div className="mt-4 flex gap-2 flex-wrap">
          <button className="px-3 py-1 rounded border" onClick={() => setStudents([])} title="Remove all students">
            Remove all students
          </button>
          <button
            className="px-3 py-1 rounded border"
            onClick={() => {
              // sample data
              const sample = [
                { id: "s1", name: "Juan Dela Cruz" },
                { id: "s2", name: "Maria Santos" },
                { id: "s3", name: "Pedro Reyes" },
              ];
              setStudents(sample);
            }}
          >
            Load sample
          </button>
        </div>
      </section>

      <section className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <label className="block text-sm font-medium">Date</label>
          <input type="date" className="mt-1 p-2 border rounded w-full" value={date} onChange={(e) => setDate(e.target.value)} />

          <div className="mt-4 flex gap-2">
            <button className="px-3 py-1 rounded border" onClick={() => markAll("present")}>Mark all Present</button>
            <button className="px-3 py-1 rounded border" onClick={() => markAll("absent")}>Mark all Absent</button>
            <button className="px-3 py-1 rounded border" onClick={clearDate}>Clear date</button>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium">Filter</label>
            <select className="mt-1 p-2 border rounded w-full" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">All</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
            </select>
          </div>

          <div className="mt-4">
            <button className="px-3 py-2 rounded bg-green-600 text-white w-full" onClick={exportCSV}>Export CSV</button>
          </div>
        </div>

        <div className="md:col-span-2 bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold mb-2">Students ({students.length})</h2>
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
                {filteredStudents.map((s) => {
                  const val = records[date] && records[date][s.id];
                  return (
                    <tr key={s.id} className="border-b hover:bg-gray-50">
                      <td className="py-2">{s.name}</td>
                      <td className="py-2">
                        <div className="inline-flex gap-2">
                          <button className={`px-2 py-1 rounded border ${val === "present" ? "bg-green-100" : ""}`} onClick={() => setRecords((r) => ({ ...r, [date]: { ...(r[date] || {}), [s.id]: "present" } }))}>
                            Present
                          </button>
                          <button className={`px-2 py-1 rounded border ${val === "absent" ? "bg-red-100" : ""}`} onClick={() => setRecords((r) => ({ ...r, [date]: { ...(r[date] || {}), [s.id]: "absent" } }))}>
                            Absent
                          </button>
                          <button className="px-2 py-1 rounded border" onClick={() => toggleAttendance(s.id)}>Toggle</button>
                        </div>
                      </td>
                      <td className="py-2">
                        {(() => {
                          const sum = attendanceSummaryForStudent(s.id);
                          return (
                            <div className="text-sm text-gray-700">{sum.present} present • {sum.absent} absent • {sum.total} recorded</div>
                          );
                        })()}
                      </td>
                      <td className="py-2">
                        <button className="px-2 py-1 rounded border text-sm" onClick={() => removeStudent(s.id)}>Remove</button>
                      </td>
                    </tr>
                  );
                })}
                {students.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-gray-500">No students yet. Add one above or load sample.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <footer className="text-sm text-gray-600 mt-6">
        Local-only demo — data stored in your browser. For multi-user or server-backed attendance, integrate a backend API and authentication.
      </footer>
    </div>
  );
}
