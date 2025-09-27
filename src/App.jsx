import React, { useEffect, useState } from "react";
import logo from "./assets/logo.png";
import { loadAttendanceData, saveAttendanceData } from "./syncWithSupabase";

const LOGIN_KEY = "attendance_login_v1";
const USERS = [
  { username: "leader_4pm", password: "leader4PM" },
  { username: "leader_5am", password: "leader5AM" },
  { username: "leader_8am", password: "leader8AM" },
  { username: "leader_10am", password: "leader10AM" },
  { username: "leader_6pm", password: "leader6PM" },
];

function formatDateISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function AttendanceTracker() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginInput, setLoginInput] = useState({ username: "", password: "" });
  const [altarServers, setAltarServers] = useState([]);
  const [records, setRecords] = useState({});
  const [nameInput, setNameInput] = useState("");
  const [date, setDate] = useState(formatDateISO(new Date()));
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  // check login from localStorage
  useEffect(() => {
    const loggedIn = localStorage.getItem(LOGIN_KEY);
    if (loggedIn === "true") setIsLoggedIn(true);
  }, []);

  // load Supabase data after login
  useEffect(() => {
    if (!isLoggedIn) return;

    const fetchData = async () => {
      setLoading(true);
      const { altarServers, records } = await loadAttendanceData();
      setAltarServers(altarServers || []);
      setRecords(records || {});
      setLoading(false);
    };

    fetchData();
  }, [isLoggedIn]);

  // save any change immediately to Supabase
  useEffect(() => {
    if (!isLoggedIn) return;
    const saveData = async () => {
      await saveAttendanceData({ altarServers, records });
    };
    saveData();
  }, [altarServers, records, isLoggedIn]);

  // login/logout handlers
  const handleLogin = (e) => {
    e.preventDefault();
    const found = USERS.find(
      (u) =>
        u.username === loginInput.username && u.password === loginInput.password
    );
    if (found) {
      setIsLoggedIn(true);
      localStorage.setItem(LOGIN_KEY, "true");
      localStorage.setItem("login_user", found.username);
    } else {
      alert("Invalid username or password!");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem(LOGIN_KEY);
    localStorage.removeItem("login_user");
  };

  // attendance logic
  const addAltarServer = (e) => {
    e?.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) return;

    const currentUser = localStorage.getItem("login_user");
    const userGroup = currentUser ? currentUser.split("_")[1] : "";

    const duplicate = altarServers.some(
      (s) =>
        s.name.toLowerCase() === trimmed.toLowerCase() && s.group === userGroup
    );
    if (duplicate) {
      alert("This altar server is already recorded!");
      return;
    }

    const id = Date.now().toString();
    const newList = [...altarServers, { id, name: trimmed, group: userGroup }];
    newList.sort((a, b) => a.name.localeCompare(b.name));
    setAltarServers(newList);
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
      filteredAltarServers.forEach((s) => (row[s.id] = status));
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

  const currentUser = localStorage.getItem("login_user");
  const userGroup = currentUser ? currentUser.split("_")[1] : "";
  const groupFilteredServers = altarServers.filter((s) => s.group === userGroup);
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
          className="bg-[#e0f3ff] p-6 rounded-[1rem] shadow-md w-[32rem] h-[32.5rem]"
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

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;

  return (
    <div className="flex justify-center items-center">
      <div className="max-w-5xl mx-auto p-6">
        <header className="mb-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold mb-1 text-[#11a9f0]">SRP Altar Servers Attendance</h1>
          <button onClick={handleLogout} className="px-4 py-2 rounded bg-[#6d8391] cursor-pointer text-white hover:bg-[#317199]">Logout</button>
        </header>

        {/* Tracker Section */}
        <section className="bg-white rounded-lg shadow p-4 mb-6">
          <form onSubmit={addAltarServer} className="flex gap-2">
            <input className="flex-1 border rounded px-3 py-2" placeholder="Add Altar Server Full Name and Press Enter"
              value={nameInput} onChange={(e) => setNameInput(e.target.value)} />
            <button className="px-4 py-2 rounded bg-[#42aaff] text-white cursor-pointer hover:bg-blue-700" onClick={addAltarServer}>Add</button>
          </form>
          <div className="mt-4 flex gap-2 flex-wrap">
            <button className="px-3 py-1 rounded border cursor-pointer bg-[#42aaff] text-white hover:bg-blue-700" onClick={() => setAltarServers([])} title="Remove all altar servers">Remove all</button>
          </div>
        </section>

        {/* Attendance Table */}
        <section className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <label className="block text-sm font-medium">Date</label>
            <input type="date" className="mt-1 p-2 border rounded w-full" value={date} onChange={(e) => setDate(e.target.value)} />
            <div className="mt-4 flex gap-2">
              <button className="px-3 py-1 rounded border bg-[#30b017] text-white cursor-pointer hover:bg-[#48de2a]" onClick={() => markAll("present")}>Mark all Present</button>
              <button className="px-3 py-1 rounded border bg-[#e63c3c] text-white cursor-pointer hover:bg-[#f56464]" onClick={() => markAll("absent")}>Mark all Absent</button>
              <button className="px-3 py-1 rounded bg-[#42aaff] text-white cursor-pointer hover:bg-blue-600" onClick={clearDate}>Clear Date</button>
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
            <h2 className="font-semibold mb-2">Altar Servers ({filteredAltarServers.length})</h2>
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
                            <button className={`px-2 py-1 rounded border hover:bg-green-100 cursor-pointer ${val === "present" ? "bg-green-100" : ""}`} onClick={() => setRecords(r => ({ ...r, [date]: { ...(r[date] || {}), [s.id]: "present" } }))}>Present</button>
                            <button className={`px-2 py-1 rounded border hover:bg-red-100 cursor-pointer ${val === "absent" ? "bg-red-100" : ""}`} onClick={() => setRecords(r => ({ ...r, [date]: { ...(r[date] || {}), [s.id]: "absent" } }))}>Absent</button>
                            <button className={`px-2 py-1 rounded border hover:bg-yellow-100 cursor-pointer ${val === "late" ? "bg-yellow-100" : ""}`} onClick={() => setRecords(r => ({ ...r, [date]: { ...(r[date] || {}), [s.id]: "late" } }))}>Late</button>
                          </div>
                        </td>
                        <td className="py-2 pl-2">
                          {(() => { const sum = attendanceSummaryForAltarServer(s.id); return <div className="text-sm text-gray-700">{sum.present} Present • {sum.absent} Absent • {sum.late} Late • {sum.total} Recorded</div>; })()}
                        </td>
                        <td className="py-2 px-2">
                          <button className="px-2 py-1 rounded border text-sm cursor-pointer bg-[#42aaff] text-white hover:bg-blue-600" onClick={() => removeAltarServer(s.id)}>Remove</button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredAltarServers.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-gray-500">No Altar Servers yet. Add one above.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <footer className="text-sm text-white mt-6">SAN ROQUE PARISH ALTAR SERVERS ATTENDANCE</footer>
      </div>
    </div>
  );
}
