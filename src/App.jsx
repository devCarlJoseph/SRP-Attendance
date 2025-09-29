// AttendanceTracker.jsx
import React, { useEffect, useState } from "react";
import logo from "./assets/logo.png";
import { supabase } from "./syncWithSupabase"; // ✅ corrected import

const LOGIN_KEY = "attendance_login_v1";
const STORAGE_KEY = "attendance_tracker_v1";
const USERS = [
  { username: "srp_5am", password: "srpLeader5AM", group: "5am" },
  { username: "srp_8am", password: "srpLeader8AM", group: "8am" },
  { username: "srp_10am", password: "srpLeader10AM", group: "10am" },
  { username: "srp_4pm", password: "srpLeader4PM", group: "4pm" },
  { username: "srp_6pm", password: "srpLeader6PM", group: "6pm" },
];

function formatDateISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
async function loadAttendanceData() {
  const userGroup = localStorage.getItem("login_group");

  // First get servers for this group
  const { data: altarServers, error: serversError } = await supabase
    .from("altar_servers")
    .select("*")
    .eq("group_name", userGroup);
  if (serversError) {
    console.error("Error loading servers:", serversError);
    return { altarServers: [], records: {} };
  }

  let records = {};
  if (altarServers?.length) {
    const ids = altarServers.map((s) => s.id);

    // ✅ Now fetch attendance ONLY for these server IDs
    const { data: attendanceRows, error: recordsError } = await supabase
      .from("attendance_records")
      .select("*")
      .in("server_id", ids);

    if (recordsError) console.error("Error loading records:", recordsError);

    (attendanceRows || []).forEach((row) => {
      if (!records[row.date]) records[row.date] = {};
      records[row.date][row.server_id] = row.status;
    });
  }

  return { altarServers: altarServers || [], records };
}

// ✅ Save altar servers + attendance records to Supabase
async function saveAttendanceData({ altarServers, records }) {
  const userGroup = localStorage.getItem("login_group");

  // ✅ Save servers
  if (records._servers?.length) {
    for (const s of records._servers) {
      if (s.group_name === userGroup) {
        const { error } = await supabase
          .from("altar_servers")
          .upsert([{ id: s.id, name: s.name, group_name: s.group_name }]);
        if (error) console.error("Error saving server:", error);
      }
    }
  }

  // ✅ Save attendance
  for (const d of Object.keys(records)) {
    if (d === "_servers") continue; // skip helper key
    for (const server_id of Object.keys(records[d])) {
      const status = records[d][server_id];
      const server = altarServers.find((s) => s.id === server_id);

      if (server && server.group_name === userGroup) {
        const { error } = await supabase
          .from("attendance_records")
          .upsert(
            [{ server_id, date: d, status }],
            { onConflict: ["date", "server_id"] }
          );
        if (error) console.error("Error saving attendance:", error);
      }
    }
  }
}

export default function AttendanceTracker() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginInput, setLoginInput] = useState({ username: "", password: "" });
  const [altarServers, setAltarServers] = useState([]);
  const [nameInput, setNameInput] = useState("");
  const [date, setDate] = useState(formatDateISO(new Date()));
  const [records, setRecords] = useState({});
  const [dirtyRecords, setDirtyRecords] = useState({});
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  // ✅ Load login state
  useEffect(() => {
    const loggedIn = localStorage.getItem(LOGIN_KEY);
    if (loggedIn === "true") setIsLoggedIn(true);
  }, []);

  // ✅ Load from Supabase once logged in
  useEffect(() => {
    if (!isLoggedIn) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const { altarServers: supaServers, records: supaRecords } =
          await loadAttendanceData();

        const raw = localStorage.getItem(STORAGE_KEY);
        const localData = raw
          ? JSON.parse(raw)
          : { altarServers: [], records: {} };

        // Merge servers
        const mergedServers = [...localData.altarServers, ...supaServers].filter(
          (v, i, a) => a.findIndex((t) => t.id === v.id) === i
        );

        // Merge records
        const mergedRecords = { ...localData.records, ...supaRecords };

        setAltarServers(mergedServers);
        setRecords(mergedRecords);
        setLoading(false);
      } catch (err) {
        console.error("Error loading data:", err);
        setLoading(false);
      }
    };

    fetchData();
  }, [isLoggedIn]);

  // ✅ Auto-save dirty changes
  useEffect(() => {
    if (!isLoggedIn || loading) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ altarServers, records }));

    if (Object.keys(dirtyRecords).length === 0) return;

    const timeout = setTimeout(async () => {
      try {
        await saveAttendanceData({ altarServers, records: dirtyRecords });
        setDirtyRecords({});
      } catch (err) {
        console.error("Supabase save failed:", err);
      }
    }, 1500);

    return () => clearTimeout(timeout);
  }, [records, altarServers, dirtyRecords, isLoggedIn, loading]);

  // ✅ FIXED Login / Logout
  const handleLogin = (e) => {
    e.preventDefault();
    const { username, password } = loginInput;

    const user = USERS.find(
      (u) =>
        u.username === username.trim() && u.password === password.trim()
    );

    if (user) {
      setIsLoggedIn(true);
      localStorage.setItem(LOGIN_KEY, "true");
      localStorage.setItem("login_user", user.username);
      localStorage.setItem("login_group", user.group); // ✅ store group
    } else {
      alert("Invalid username or password");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem(LOGIN_KEY);
    localStorage.removeItem("login_user");
    localStorage.removeItem("login_group");
  };

  // ✅ Add / Remove altar servers
  const addAltarServer = (e) => {
    e?.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) return;

    const userGroup = localStorage.getItem("login_group") || "";

    const duplicate = altarServers.some(
      (s) =>
        s.name.toLowerCase() === trimmed.toLowerCase() &&
        s.group_name === userGroup
    );
    if (duplicate) {
      alert("This altar server is already recorded!");
      return;
    }

    const id = Date.now().toString();
    const newServer = { id, name: trimmed, group_name: userGroup };
    const newList = [...altarServers, newServer];
    newList.sort((a, b) => a.name.localeCompare(b.name));
    setAltarServers(newList);
    setNameInput("");

    // ✅ mark for sync
    setDirtyRecords((d) => ({
      ...d,
      _servers: [...(d._servers || []), newServer],
    }));
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
      setDirtyRecords((d) => {
        const copyDirty = { ...d };
        for (const dd of Object.keys(copyDirty)) {
          if (copyDirty[dd][id]) delete copyDirty[dd][id];
        }
        return copyDirty;
      });
      return copy;
    });
  };

  // ✅ Mark attendance
  const markAttendance = (serverId, status) => {
    setRecords((r) => {
      const updated = { ...r, [date]: { ...(r[date] || {}), [serverId]: status } };
      setDirtyRecords((d) => ({
        ...d,
        [date]: { ...(d[date] || {}), [serverId]: status },
      }));
      return updated;
    });
  };

  const markAll = (status) => {
    const userGroup = localStorage.getItem("login_group") || "";
    const groupServers = altarServers.filter((s) => s.group_name === userGroup);

    setRecords((r) => {
      const row = {};
      groupServers.forEach((s) => (row[s.id] = status));
      setDirtyRecords((d) => ({ ...d, [date]: row }));
      return { ...r, [date]: row };
    });
  };

  const clearDate = () => {
    setRecords((r) => {
      const copy = { ...r };
      delete copy[date];
      setDirtyRecords((d) => {
        const copyDirty = { ...d };
        delete copyDirty[date];
        return copyDirty;
      });
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
      if (val) total++;
    }
    return { present, absent, late, total };
  };

  const userGroup = localStorage.getItem("login_group") || "";
  const groupFilteredServers = altarServers.filter(
    (s) => s.group_name === userGroup
  );
  const filteredAltarServers = groupFilteredServers.filter((s) => {
    if (filter === "all") return true;
    const val = records[date] && records[date][s.id];
    if (filter === "present") return val === "present";
    if (filter === "late") return val === "late";
    if (filter === "absent") return val === "absent" || !val;
    return true;
  });

  if (!isLoggedIn) {
    return (
      <div className="flex justify-center items-center h-screen">
        <form
          onSubmit={handleLogin}
          className="bg-[#e0f3ff] p-6 rounded-[1rem] shadow-md w-[32rem]"
        >
          <div className="flex justify-center items-center">
            <img src={logo} className="w-[10rem]" />
          </div>
          <h2 className="text-xl font-bold text-center text-[#6a93ab]">
            Welcome Back Leaders
          </h2>
          <p className="text-center mb-4 text-[#88a6b8]">
            Track and manage today’s altar server attendance with ease.
          </p>
          <label className="font-medium text-[#57768a]">Username</label>
          <input
            type="text"
            placeholder="Enter Username"
            className="w-full mb-3 mt-1 p-2 pl-4 border-2 border-[#6a93ab] rounded-[0.8rem] outline-none"
            value={loginInput.username}
            onChange={(e) =>
              setLoginInput({ ...loginInput, username: e.target.value })
            }
          />
          <label className="font-medium text-[#57768a]">Password</label>
          <input
            type="password"
            placeholder="Enter Password"
            className="w-full mb-3 mt-1 p-2 pl-4 border-2 border-[#6a93ab] rounded-[0.8rem] outline-none"
            value={loginInput.password}
            onChange={(e) =>
              setLoginInput({ ...loginInput, password: e.target.value })
            }
          />
          <div className="flex justify-center items-center">
            <button
              type="submit"
              className="w-[20rem] mt-[0.5rem] bg-[#42aaff] text-white py-2 rounded-[0.8rem] cursor-pointer hover:bg-blue-700"
            >
              Log In
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );

  return (
    <div className="flex justify-center items-center">
      <div className="max-w-5xl mx-auto p-6">
        <header className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold mb-1 text-[#11a9f0]">
            SRP Altar Servers Attendance
          </h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded bg-[#6d8391] cursor-pointer text-white hover:bg-[#317199]"
          >
            Logout
          </button>
        </header>

        {/* Tracker Section */}
        <section className="bg-white rounded-lg shadow p-4 mb-6">
          <form onSubmit={addAltarServer} className="flex gap-2">
            <input
              className="flex-1 border rounded px-3 py-2"
              placeholder="Add Altar Server Full Name and Press Enter"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
            />
            <button
              className="px-4 py-2 rounded bg-[#42aaff] text-white cursor-pointer hover:bg-blue-700"
              onClick={addAltarServer}
            >
              Add
            </button>
          </form>
          <div className="mt-4 flex gap-2 flex-wrap">
            <button
              className="px-3 py-1 rounded border cursor-pointer bg-[#42aaff] text-white hover:bg-blue-700"
              onClick={() => setAltarServers([])}
            >
              Remove all
            </button>
          </div>
        </section>

        {/* Attendance Table */}
        <section className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <label className="block text-sm font-medium">Date</label>
            <input
              type="date"
              className="mt-1 p-2 border rounded w-full"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <div className="mt-4 flex gap-2">
              <button
                className="px-3 py-1 rounded border bg-[#30b017] text-white cursor-pointer hover:bg-[#48de2a]"
                onClick={() => markAll("present")}
              >
                Mark all Present
              </button>
              <button
                className="px-3 py-1 rounded border bg-[#e63c3c] text-white cursor-pointer hover:bg-[#f56464]"
                onClick={() => markAll("absent")}
              >
                Mark all Absent
              </button>
              <button
                className="px-3 py-1 rounded bg-[#42aaff] text-white cursor-pointer hover:bg-blue-600"
                onClick={clearDate}
              >
                Clear Date
              </button>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium">Filter</label>
              <select
                className="mt-1 p-2 border rounded w-full"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
              </select>
            </div>
          </div>

          <div className="md:col-span-2 bg-white rounded-lg shadow p-4">
            <h2 className="font-semibold mb-2">
              Altar Servers ({filteredAltarServers.length})
            </h2>
            <div className="overflow-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="border-b">
                    <th className="py-2">Name</th>
                    <th className="py-2 px-2">Date ({date})</th>
                    <th className="py-2 px-2">Summary</th>
                    <th className="py-2 px-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAltarServers.map((s) => {
                    const val = records[date] && records[date][s.id];
                    return (
                      <tr key={s.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-2">{s.name}</td>
                        <td className="py-2 px-1">
                          <div className="inline-flex gap-2">
                            <button
                              className={`px-2 py-1 rounded border hover:bg-green-100 cursor-pointer ${val === "present" ? "bg-green-100" : ""
                                }`}
                              onClick={() => markAttendance(s.id, "present")}
                            >
                              Present
                            </button>
                            <button
                              className={`px-2 py-1 rounded border hover:bg-red-100 cursor-pointer ${val === "absent" ? "bg-red-100" : ""
                                }`}
                              onClick={() => markAttendance(s.id, "absent")}
                            >
                              Absent
                            </button>
                            <button
                              className={`px-2 py-1 rounded border hover:bg-yellow-100 cursor-pointer ${val === "late" ? "bg-yellow-100" : ""
                                }`}
                              onClick={() => markAttendance(s.id, "late")}
                            >
                              Late
                            </button>
                          </div>
                        </td>
                        <td className="py-2 px-2 text-sm text-gray-500">
                          {(() => {
                            const ssum =
                              attendanceSummaryForAltarServer(s.id);
                            return `P: ${ssum.present}, A: ${ssum.absent}, L: ${ssum.late}, Total: ${ssum.total}`;
                          })()}
                        </td>
                        <td className="py-2 px-2">
                          <button
                            className="px-2 py-1 rounded bg-red-500 text-white cursor-pointer hover:bg-red-700"
                            onClick={() => removeAltarServer(s.id)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredAltarServers.length === 0 && (
                    <tr>
                      <td colSpan="4" className="py-4 text-center text-gray-500">
                        No altar servers found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
