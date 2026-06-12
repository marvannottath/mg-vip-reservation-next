"use client";

import { useEffect, useState } from "react";
import db from "@/lib/db";

export default function FrontOfficePortal() {
  const [isLogged, setIsLogged] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState(false);

  // Today's Date State
  const [todayStr, setTodayStr] = useState("");
  const [bookings, setBookings] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Walk-in Dialog State
  const [showWalkinModal, setShowWalkinModal] = useState(false);
  const [targetSlot, setTargetSlot] = useState("noon");
  const [walkinForm, setWalkinForm] = useState({
    name: "",
    phone: "",
    serviceCategory: "",
    notes: ""
  });

  useEffect(() => {
    // Get today's local date string
    const today = new Date().toISOString().split("T")[0];
    setTodayStr(today);

    setBookings(db.getBookings());
    setDepartments(db.getDepartments());

    if (typeof window !== "undefined") {
      const logged = sessionStorage.getItem("mg_front_logged") === "true";
      setIsLogged(logged);
    }

    // Dynamic sync listeners
    const handleSync = () => {
      setBookings(db.getBookings());
      setDepartments(db.getDepartments());
    };

    window.addEventListener("db-synced", handleSync);
    return () => {
      window.removeEventListener("db-synced", handleSync);
    };
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (username.trim() === "reception" && password.trim() === "reception") {
      sessionStorage.setItem("mg_front_logged", "true");
      setIsLogged(true);
      setLoginError(false);
    } else {
      setLoginError(true);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("mg_front_logged");
    setIsLogged(false);
  };

  // Get active bookings for today
  const todayBookings = bookings.filter(
    b => b.date === todayStr && b.status !== "Cancelled" && b.status !== "No Show"
  );

  const noonBookings = todayBookings.filter(b => b.slot === "noon");
  const afternoonBookings = todayBookings.filter(b => b.slot === "afternoon");

  const handleWalkinSubmit = (e) => {
    e.preventDefault();
    if (!walkinForm.name.trim() || !walkinForm.phone.trim() || !walkinForm.serviceCategory) {
      alert("All fields marked * are required.");
      return;
    }

    // Check capacity first
    const activeSlotBookingsCount = bookings.filter(
      b => b.date === todayStr && b.slot === targetSlot && b.status !== "Cancelled" && b.status !== "No Show"
    ).length;

    if (activeSlotBookingsCount >= 3) {
      alert("This session slot is already at full capacity (3 bookings maximum). Cannot accept check-in.");
      return;
    }

    const confCode = "MG-W-" + Math.floor(100000 + Math.random() * 900000);
    const walkinBooking = {
      referenceCode: confCode,
      consultationType: "showroom_walkthrough",
      serviceCategory: walkinForm.serviceCategory,
      executive: "showroom",
      date: todayStr,
      slot: targetSlot,
      name: walkinForm.name.trim() + " (Walk-in)",
      phone: walkinForm.phone.trim(),
      notes: walkinForm.notes.trim() || "Front Desk Walk-in Guest",
      timestamp: new Date().toLocaleString(),
      status: "Approved" // Auto-approve walk-ins registered by staff
    };

    db.saveBooking(walkinBooking);
    setBookings(db.getBookings());

    // Reset Form
    setWalkinForm({ name: "", phone: "", serviceCategory: "", notes: "" });
    setShowWalkinModal(false);
  };

  if (!isLogged) {
    return (
      <div className="admin-portal-body min-h-screen flex items-center justify-center bg-[#FAF9F6] p-6">
        <div className="admin-login-wrapper w-full max-w-[400px] bg-white border border-[#A98438]/20 rounded-xl p-8 shadow-xl">
          <div className="text-center mb-8">
            <svg className="h-10 w-auto text-[#A98438] mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 82 40">
              <rect x="0" y="5" width="8" height="30" fill="currentColor" />
              <rect x="14" y="5" width="8" height="30" fill="currentColor" />
              <rect x="28" y="5" width="8" height="30" fill="currentColor" />
              <rect x="0" y="5" width="36" height="8" fill="currentColor" />
              <rect x="46" y="5" width="8" height="30" fill="currentColor" />
              <rect x="46" y="5" width="36" height="8" fill="currentColor" />
              <rect x="46" y="27" width="36" height="8" fill="currentColor" />
              <rect x="74" y="5" width="8" height="11" fill="currentColor" />
              <rect x="74" y="20" width="8" height="15" fill="currentColor" />
              <rect x="64" y="20" width="10" height="8" fill="currentColor" />
            </svg>
            <h2 className="font-serif italic text-2xl text-[#111]">LE MARBLE GALLERY</h2>
            <p className="text-xs tracking-wider uppercase text-[#A98438] font-semibold mt-1">Front Desk Reception</p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.68rem] uppercase tracking-widest text-[#111]/45 font-semibold">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-[#FAF9F6] border border-[#A98438]/20 rounded-lg p-3 text-sm text-[#111] outline-none focus:border-[#A98438] transition-all"
                placeholder="e.g. reception"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[0.68rem] uppercase tracking-widest text-[#111]/45 font-semibold">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-[#FAF9F6] border border-[#A98438]/20 rounded-lg p-3 text-sm text-[#111] outline-none focus:border-[#A98438] transition-all"
                placeholder="••••••••"
              />
            </div>

            {loginError && (
              <p className="text-xs font-semibold text-red-500 text-center animate-shake">
                Invalid credentials. Please retry.
              </p>
            )}

            <button
              type="submit"
              className="bg-[#A98438] text-white font-semibold text-xs tracking-widest uppercase py-3.5 rounded hover:brightness-110 active:scale-95 transition-all mt-3"
            >
              Access Front Office Portal
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-portal-body min-h-screen bg-[#FAF9F6] font-sans flex flex-col justify-between relative text-[#111] overflow-x-hidden">
      
      {/* Header */}
      <header className="admin-header bg-white border-b border-[#A98438]/10 px-6 md:px-12 py-4 flex justify-between items-center z-40 sticky top-0">
        <div className="flex items-center gap-3">
          <span className="font-serif font-bold text-lg text-[#111] tracking-wide">Le Marble Gallery</span>
          <span className="bg-[#A98438]/10 text-[#A98438] text-[0.6rem] tracking-widest uppercase px-2.5 py-1 rounded font-bold">Front Desk Reception</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col text-right">
            <span className="text-[0.68rem] uppercase tracking-wider text-[#111]/45 font-bold">TODAY'S RESORT ACTIVE DATE</span>
            <span className="text-sm font-serif italic font-semibold text-[#A98438]">{new Date().toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs uppercase font-semibold text-red-500 hover:text-red-600 transition-colors border border-red-500/20 px-3 py-1.5 rounded-full"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main timeline schedule */}
      <main className="flex-grow max-w-[1000px] w-full mx-auto px-6 py-10 flex flex-col gap-8">
        
        <div className="flex flex-col gap-2">
          <h1 className="font-serif italic text-3xl text-[#111]">Showroom Capacity Tracker</h1>
          <p className="text-sm text-[#111]/60 leading-relaxed">
            Real-time showroom floor slots. Track reservations for today and register instant walk-in clients. Limit: Max 3 bookings per session.
          </p>
        </div>

        {/* Schedule grid timeline */}
        <div className="flex flex-col gap-6">
          
          {/* Noon Session Slot */}
          <div className={`border rounded-xl bg-white shadow-sm p-6 flex flex-col md:flex-row justify-between gap-6 items-start md:items-center transition-all ${noonBookings.length >= 3 ? 'border-red-500/30' : 'border-[#A98438]/10'}`}>
            <div className="flex items-start gap-4">
              <div className={`h-12 w-12 rounded-lg flex flex-col items-center justify-center text-[#111] font-bold border ${noonBookings.length >= 3 ? 'border-red-500/25 bg-red-500/10 text-red-500' : 'border-[#A98438]/20 bg-[#FAF9F6] text-[#A98438]'}`}>
                <span className="text-sm">11:30</span>
                <span className="text-[0.55rem] uppercase tracking-widest -mt-1 font-bold">AM</span>
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg">Noon Session</h3>
                <p className="text-xs text-[#111]/50 mt-0.5">Capacity occupancy: {noonBookings.length} of 3</p>
              </div>
            </div>

            {/* Bookings details or checkin button */}
            <div className="flex flex-col gap-3 flex-grow md:max-w-md w-full">
              {noonBookings.length === 0 ? (
                <p className="text-xs text-green-600 font-semibold italic flex items-center gap-1">
                  <i className="fa-solid fa-circle-check"></i>
                  <span>No scheduled clients. Fully open for walk-ins.</span>
                </p>
              ) : (
                <div className="flex flex-col gap-2 bg-[#FAF9F6] p-3 rounded-lg border border-[#A98438]/5">
                  <span className="text-[0.62rem] uppercase tracking-wider text-red-500 font-bold block mb-1">Active Registrations (RED Alert Occupancy):</span>
                  {noonBookings.map(b => {
                    const dept = departments.find(d => d.id === b.serviceCategory);
                    const deptName = dept ? dept.name : b.serviceCategory;
                    return (
                      <div key={b.referenceCode} className="text-xs flex justify-between items-center bg-white p-2 rounded border border-red-500/10">
                        <div>
                          <span className="font-semibold block">{b.name}</span>
                          <span className="text-[0.65rem] text-[#111]/50 font-medium">Department: {deptName}</span>
                        </div>
                        <span className="font-mono text-[0.68rem] bg-[#A98438]/10 text-[#A98438] px-1.5 py-0.5 rounded font-bold">{b.referenceCode}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="w-full md:w-auto">
              {noonBookings.length >= 3 ? (
                <span className="bg-red-500 text-white text-[0.68rem] tracking-wider uppercase font-bold px-4 py-2.5 rounded-lg flex items-center justify-center gap-1.5 w-full md:w-auto">
                  <i className="fa-solid fa-ban"></i>
                  <span>Fully Booked</span>
                </span>
              ) : (
                <button
                  onClick={() => { setTargetSlot("noon"); setShowWalkinModal(true); }}
                  className="bg-green-600 text-white text-[0.68rem] tracking-wider uppercase font-bold px-4 py-2.5 rounded-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5 w-full md:w-auto"
                >
                  <i className="fa-solid fa-plus"></i>
                  <span>Check-in Walk-in</span>
                </button>
              )}
            </div>
          </div>

          {/* Afternoon Session Slot */}
          <div className={`border rounded-xl bg-white shadow-sm p-6 flex flex-col md:flex-row justify-between gap-6 items-start md:items-center transition-all ${afternoonBookings.length >= 3 ? 'border-red-500/30' : 'border-[#A98438]/10'}`}>
            <div className="flex items-start gap-4">
              <div className={`h-12 w-12 rounded-lg flex flex-col items-center justify-center text-[#111] font-bold border ${afternoonBookings.length >= 3 ? 'border-red-500/25 bg-red-500/10 text-red-500' : 'border-[#A98438]/20 bg-[#FAF9F6] text-[#A98438]'}`}>
                <span className="text-sm">03:00</span>
                <span className="text-[0.55rem] uppercase tracking-widest -mt-1 font-bold">PM</span>
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg">Afternoon Session</h3>
                <p className="text-xs text-[#111]/50 mt-0.5">Capacity occupancy: {afternoonBookings.length} of 3</p>
              </div>
            </div>

            {/* Bookings details or checkin button */}
            <div className="flex flex-col gap-3 flex-grow md:max-w-md w-full">
              {afternoonBookings.length === 0 ? (
                <p className="text-xs text-green-600 font-semibold italic flex items-center gap-1">
                  <i className="fa-solid fa-circle-check"></i>
                  <span>No scheduled clients. Fully open for walk-ins.</span>
                </p>
              ) : (
                <div className="flex flex-col gap-2 bg-[#FAF9F6] p-3 rounded-lg border border-[#A98438]/5">
                  <span className="text-[0.62rem] uppercase tracking-wider text-red-500 font-bold block mb-1">Active Registrations (RED Alert Occupancy):</span>
                  {afternoonBookings.map(b => {
                    const dept = departments.find(d => d.id === b.serviceCategory);
                    const deptName = dept ? dept.name : b.serviceCategory;
                    return (
                      <div key={b.referenceCode} className="text-xs flex justify-between items-center bg-white p-2 rounded border border-red-500/10">
                        <div>
                          <span className="font-semibold block">{b.name}</span>
                          <span className="text-[0.65rem] text-[#111]/50 font-medium">Department: {deptName}</span>
                        </div>
                        <span className="font-mono text-[0.68rem] bg-[#A98438]/10 text-[#A98438] px-1.5 py-0.5 rounded font-bold">{b.referenceCode}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="w-full md:w-auto">
              {afternoonBookings.length >= 3 ? (
                <span className="bg-red-500 text-white text-[0.68rem] tracking-wider uppercase font-bold px-4 py-2.5 rounded-lg flex items-center justify-center gap-1.5 w-full md:w-auto">
                  <i className="fa-solid fa-ban"></i>
                  <span>Fully Booked</span>
                </span>
              ) : (
                <button
                  onClick={() => { setTargetSlot("afternoon"); setShowWalkinModal(true); }}
                  className="bg-green-600 text-white text-[0.68rem] tracking-wider uppercase font-bold px-4 py-2.5 rounded-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5 w-full md:w-auto"
                >
                  <i className="fa-solid fa-plus"></i>
                  <span>Check-in Walk-in</span>
                </button>
              )}
            </div>
          </div>

        </div>

      </main>

      {/* Walk-in check-in Dialog Modal */}
      {showWalkinModal && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-white border border-[#A98438]/20 rounded-xl p-6 w-full max-w-[450px] shadow-2xl relative">
            <button
              onClick={() => setShowWalkinModal(false)}
              className="absolute top-4 right-4 text-[#111]/30 hover:text-[#111]/70"
            >
              <i className="fa-solid fa-times text-lg"></i>
            </button>

            <h3 className="font-serif font-bold text-xl mb-1 text-[#A98438]">Front Office Check-in</h3>
            <p className="text-xs text-[#111]/50 mb-5 uppercase tracking-wide">
              Register walk-in client for the {targetSlot === "noon" ? "Noon (11:30 AM)" : "Afternoon (3:00 PM)"} session
            </p>

            <form onSubmit={handleWalkinSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[0.68rem] uppercase tracking-widest text-[#111]/40 font-bold">Client Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Architect Rahul"
                  value={walkinForm.name}
                  onChange={(e) => setWalkinForm(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-[#FAF9F6] border border-[#A98438]/20 rounded-lg p-3 text-sm text-[#111] outline-none focus:border-[#A98438] transition-all"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[0.68rem] uppercase tracking-widest text-[#111]/40 font-bold">WhatsApp Phone *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9895225599"
                  value={walkinForm.phone}
                  onChange={(e) => setWalkinForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="bg-[#FAF9F6] border border-[#A98438]/20 rounded-lg p-3 text-sm text-[#111] outline-none focus:border-[#A98438] transition-all"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[0.68rem] uppercase tracking-widest text-[#111]/40 font-bold">Showroom Department *</label>
                <select
                  required
                  value={walkinForm.serviceCategory}
                  onChange={(e) => setWalkinForm(prev => ({ ...prev, serviceCategory: e.target.value }))}
                  className="bg-[#FAF9F6] border border-[#A98438]/20 rounded-lg p-3 text-sm text-[#111] outline-none focus:border-[#A98438] transition-all"
                >
                  <option value="">-- Choose Category --</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[0.68rem] uppercase tracking-widest text-[#111]/40 font-bold">Internal Reception Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Walk-in client. Needs immediate designer assist."
                  value={walkinForm.notes}
                  onChange={(e) => setWalkinForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="bg-[#FAF9F6] border border-[#A98438]/20 rounded-lg p-3 text-sm text-[#111] outline-none focus:border-[#A98438] transition-all"
                />
              </div>

              <button
                type="submit"
                className="bg-green-600 text-white font-semibold text-xs tracking-widest uppercase py-3.5 rounded hover:brightness-110 active:scale-95 transition-all mt-2 flex items-center justify-center gap-1.5"
              >
                <i className="fa-solid fa-circle-check"></i>
                <span>Complete Check-in</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="px-6 md:px-12 py-6 border-t border-[#A98438]/10 text-center text-xs text-[#111]/45">
        <span>&copy; {new Date().getFullYear()} Le Marble Gallery. Front Desk Reception Suite.</span>
      </footer>

    </div>
  );
}
