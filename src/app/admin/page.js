"use client";

import { useEffect, useState, useRef } from "react";
import db from "@/lib/db";

export default function AdminPortal() {
  const [isLogged, setIsLogged] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState(false);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState("overview");

  // Database States
  const [bookings, setBookings] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Filter States
  const [searchVal, setSearchVal] = useState("");
  const [dateVal, setDateVal] = useState("");
  const [deptVal, setDeptVal] = useState("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  // New Department Form State
  const [newDept, setNewDept] = useState({
    id: "",
    name: "",
    desc: "",
    icon: "fa-solid fa-shapes"
  });

  // Notification States
  const [notifications, setNotifications] = useState([]);
  const [readNotifications, setReadNotifications] = useState([]);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [toasts, setToasts] = useState([]);

  const lastKnownBookingsCount = useRef(0);
  const audioContextRef = useRef(null);

  // Load baseline states on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const logged = sessionStorage.getItem("mg_admin_logged") === "true";
      setIsLogged(logged);

      // Load read notifications
      try {
        const readList = JSON.parse(localStorage.getItem("mg_read_notifications")) || [];
        setReadNotifications(readList);
      } catch (e) {}
    }

    setBookings(db.getBookings());
    setDepartments(db.getDepartments());
    lastKnownBookingsCount.current = db.getBookings().length;

    // Database polling for real-time storage synchronizations
    const handleSync = () => {
      const currentBookings = db.getBookings();
      setBookings(currentBookings);
      setDepartments(db.getDepartments());

      // Trigger alerts if bookings increase
      if (currentBookings.length > lastKnownBookingsCount.current) {
        const newRecords = currentBookings.slice(lastKnownBookingsCount.current);
        newRecords.forEach(b => triggerToast(b));
      }
      lastKnownBookingsCount.current = currentBookings.length;
    };

    window.addEventListener("db-synced", handleSync);
    const interval = setInterval(() => {
      db.fetchFromServer();
    }, 5000);

    return () => {
      window.removeEventListener("db-synced", handleSync);
      clearInterval(interval);
    };
  }, []);

  // Update Notification Center items
  useEffect(() => {
    // Filter out Cancelled/No Show bookings
    const active = bookings.filter(b => b.status !== "Cancelled" && b.status !== "No Show");

    // Sort: Unread first, then date/slot descending
    active.sort((a, b) => {
      const aUnread = !readNotifications.includes(a.referenceCode);
      const bUnread = !readNotifications.includes(b.referenceCode);
      if (aUnread !== bUnread) {
        return aUnread ? -1 : 1;
      }
      const dateA = a.date + " " + (a.slot === "noon" ? "11:30" : "15:00");
      const dateB = b.date + " " + (b.slot === "noon" ? "11:30" : "15:00");
      return dateB.localeCompare(dateA);
    });

    setNotifications(active);
  }, [bookings, readNotifications]);

  // AudioContext notification sound
  const playNotificationSound = () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const audioCtx = audioContextRef.current;
      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }

      // Note 1 (D5)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime); 
      gain1.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start();
      osc1.stop(audioCtx.currentTime + 0.35);
      
      // Note 2 (A5)
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(880, audioCtx.currentTime); 
        gain2.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.55);
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.start();
        osc2.stop(audioCtx.currentTime + 0.55);
      }, 110);
    } catch (e) {
      console.warn("Audio Context playback blocked:", e);
    }
  };

  const triggerToast = (booking) => {
    playNotificationSound();
    const newToast = {
      id: Date.now() + Math.random(),
      booking
    };
    setToasts(prev => [...prev, newToast]);

    // Auto delete after 8 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== newToast.id));
    }, 8000);
  };

  // Login handlers
  const handleLogin = (e) => {
    e.preventDefault();
    if (username.trim() === "admin" && password.trim() === "admin") {
      sessionStorage.setItem("mg_admin_logged", "true");
      setIsLogged(true);
      setLoginError(false);
    } else {
      setLoginError(true);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("mg_admin_logged");
    setIsLogged(false);
  };

  // Filter Bookings Log
  const getFilteredBookings = () => {
    let list = [...bookings].reverse(); // newest first
    
    if (searchVal) {
      const q = searchVal.toLowerCase().trim();
      list = list.filter(b => 
        (b.name && b.name.toLowerCase().includes(q)) || 
        (b.phone && b.phone.toLowerCase().includes(q)) || 
        (b.referenceCode && b.referenceCode.toLowerCase().includes(q))
      );
    }
    if (dateVal) {
      list = list.filter(b => b.date === dateVal);
    }
    if (deptVal) {
      list = list.filter(b => b.serviceCategory === deptVal);
    }
    return list;
  };

  const filteredBookings = getFilteredBookings();
  const totalPages = Math.ceil(filteredBookings.length / recordsPerPage);

  // Paginated bookings
  const paginatedBookings = filteredBookings.slice(
    (currentPage - 1) * recordsPerPage,
    currentPage * recordsPerPage
  );

  // HUD Calculations
  const todayStr = new Date().toISOString().split("T")[0];
  const totalBookingsCount = bookings.length;
  const todayBookingsCount = bookings.filter(b => b.date === todayStr && b.status !== "Cancelled" && b.status !== "No Show").length;
  const activeDeptsCount = departments.length;

  // Analytics Math
  // 1. Department Popularity
  const getDeptPopularityStats = () => {
    const counts = {};
    departments.forEach(d => { counts[d.id] = 0; });
    bookings.forEach(b => {
      if (b.serviceCategory && counts[b.serviceCategory] !== undefined) {
        counts[b.serviceCategory]++;
      }
    });

    const stats = departments.map(d => ({
      id: d.id,
      name: d.name,
      count: counts[d.id] || 0,
      pct: totalBookingsCount > 0 ? Math.round((counts[d.id] / totalBookingsCount) * 100) : 0
    }));
    return stats.sort((a, b) => b.count - a.count);
  };

  // 2. Status Breakdown
  const getStatusBreakdownStats = () => {
    const statusCounts = { "New": 0, "Approved": 0, "Cancelled": 0, "No Show": 0 };
    bookings.forEach(b => {
      if (statusCounts[b.status] !== undefined) {
        statusCounts[b.status]++;
      } else {
        statusCounts["New"]++;
      }
    });

    return Object.keys(statusCounts).map(status => ({
      status,
      count: statusCounts[status],
      pct: totalBookingsCount > 0 ? Math.round((statusCounts[status] / totalBookingsCount) * 100) : 0
    }));
  };

  // Actions
  const handleApprove = (refCode) => {
    db.updateBookingStatus(refCode, "Approved");
    setBookings(db.getBookings());

    // Trigger WhatsApp redirect template
    const booking = bookings.find(b => b.referenceCode === refCode);
    if (booking) {
      let cleanPhone = booking.phone.replace(/[^0-9]/g, "");
      if (cleanPhone.length === 10) cleanPhone = "91" + cleanPhone;
      
      const dept = departments.find(d => d.id === booking.serviceCategory);
      const deptName = dept ? dept.name : (booking.serviceCategory || "Showroom");
      const slotText = booking.slot === "noon" ? "Noon (11:30 AM)" : "Afternoon (3:00 PM)";

      const chatMsg = `Hello ${booking.name}, we are pleased to inform you that your VIP Showroom Consultation reference ${booking.referenceCode} has been Approved for the ${deptName} department. Our team will welcome you on ${booking.date} at ${slotText}. We look forward to your visit!`;
      const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(chatMsg)}`;
      window.open(waLink, "_blank");
    }
  };

  const handleCancel = (refCode) => {
    const reason = prompt("Please enter the reason for cancellation (Required to cancel booking):");
    if (reason === null) return;
    const cleanReason = reason.trim();
    if (!cleanReason) {
      alert("Cancellation reason is required to cancel this reservation.");
      return;
    }
    db.updateBookingStatus(refCode, "Cancelled", cleanReason);
    setBookings(db.getBookings());
  };

  const handleCreateDepartment = (e) => {
    e.preventDefault();
    const finalId = newDept.id.trim().toLowerCase().replace(/\s+/g, "-");
    const finalName = newDept.name.trim();
    if (!finalId || !finalName) return;

    db.saveDepartment({
      id: finalId,
      name: finalName,
      desc: newDept.desc.trim(),
      icon: newDept.icon.trim()
    });

    setNewDept({ id: "", name: "", desc: "", icon: "fa-solid fa-shapes" });
    setDepartments(db.getDepartments());
  };

  const handleDeleteDepartment = (id) => {
    if (confirm(`Are you sure you want to delete the department "${id}"?`)) {
      db.deleteDepartment(id);
      setDepartments(db.getDepartments());
    }
  };

  const handleMarkAllNotificationsRead = () => {
    const readList = [...readNotifications];
    bookings.forEach(b => {
      if (!readList.includes(b.referenceCode)) {
        readList.push(b.referenceCode);
      }
    });
    setReadNotifications(readList);
    if (typeof window !== "undefined") {
      localStorage.setItem("mg_read_notifications", JSON.stringify(readList));
    }
  };

  const handleNotificationClick = (refCode) => {
    const readList = [...readNotifications];
    if (!readList.includes(refCode)) {
      readList.push(refCode);
      setReadNotifications(readList);
      if (typeof window !== "undefined") {
        localStorage.setItem("mg_read_notifications", JSON.stringify(readList));
      }
    }
    setShowNotificationDropdown(false);
    setSearchVal(refCode);
    setDateVal("");
    setDeptVal("");
    setCurrentPage(1);
    setActiveTab("bookings");
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
            <p className="text-xs tracking-wider uppercase text-[#A98438] font-semibold mt-1">Liaison Suite Admin</p>
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
                placeholder="e.g. admin"
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
                Invalid admin credentials. Please retry.
              </p>
            )}

            <button
              type="submit"
              className="bg-[#A98438] text-white font-semibold text-xs tracking-widest uppercase py-3.5 rounded hover:brightness-110 active:scale-95 transition-all mt-3"
            >
              Access Dashboard
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
          <span className="bg-[#A98438]/10 text-[#A98438] text-[0.6rem] tracking-widest uppercase px-2.5 py-1 rounded font-bold">Liaison Suite Admin</span>
        </div>
        
        <div className="flex items-center gap-4">
          
          {/* Notification bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
              className="btn-notification-bell relative p-2.5 border border-[#A98438]/20 text-[#A98438] rounded-lg hover:bg-[#FAF9F6] transition-all"
            >
              <i className="fa-solid fa-bell"></i>
              {notifications.filter(b => !readNotifications.includes(b.referenceCode)).length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">
                  {notifications.filter(b => !readNotifications.includes(b.referenceCode)).length}
                </span>
              )}
            </button>

            {/* Notification Dropdown list */}
            {showNotificationDropdown && (
              <div className="absolute right-0 top-11 w-80 bg-white border border-[#A98438]/20 rounded-xl shadow-2xl z-50 overflow-hidden animate-fadeIn">
                <div className="bg-[#FAF9F6] border-b border-[#A98438]/15 px-4 py-3 flex justify-between items-center">
                  <span className="font-serif font-bold text-xs text-[#A98438]">New Assignments</span>
                  <button onClick={handleMarkAllNotificationsRead} className="text-[0.68rem] text-[#111]/60 underline hover:text-[#A98438]">
                    Mark all read
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[#111]/40 flex flex-col items-center gap-2">
                      <i className="fa-solid fa-bell-slash text-xl text-[#A98438]/30"></i>
                      <span>No active notifications</span>
                    </div>
                  ) : (
                    notifications.slice(0, 10).map((n) => {
                      const isUnread = !readNotifications.includes(n.referenceCode);
                      const deptName = departments.find(d => d.id === n.serviceCategory)?.name || n.serviceCategory;
                      return (
                        <div
                          key={n.referenceCode}
                          onClick={() => handleNotificationClick(n.referenceCode)}
                          className={`p-3.5 border-b border-[#A98438]/5 cursor-pointer hover:bg-[#FAF9F6] transition-colors flex items-start gap-2 ${isUnread ? 'bg-[#A98438]/4' : ''}`}
                        >
                          {isUnread && <span className="h-2 w-2 rounded-full bg-[#A98438] mt-1.5 flex-shrink-0"></span>}
                          <div className="flex-grow">
                            <h4 className="text-xs font-bold text-[#111]">New Booking: {n.name}</h4>
                            <p className="text-[0.68rem] text-[#111]/60 mt-0.5">Department: <strong>{deptName}</strong></p>
                            <span className="text-[0.62rem] text-[#FAF9F6]/40 text-[#A98438] font-bold mt-1 block">{n.date} • {n.slot === "noon" ? "11:30 AM" : "3:00 PM"}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <span className="text-xs font-semibold bg-[#111] text-white px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <i className="fa-solid fa-user-shield"></i>
            <span>Administrator</span>
          </span>
          
          <button
            onClick={handleLogout}
            className="text-xs uppercase font-semibold text-red-500 hover:text-red-600 transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Workspace Panel */}
      <div className="flex-grow flex flex-col md:flex-row max-w-[1400px] w-full mx-auto px-6 md:px-12 py-8 gap-8">
        
        {/* Sidebar Tabs */}
        <aside className="w-full md:w-56 flex-shrink-0">
          <nav className="flex flex-row md:flex-col gap-2 overflow-x-auto pb-3 md:pb-0">
            <button
              onClick={() => { setActiveTab("overview"); setCurrentPage(1); }}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg text-xs font-semibold tracking-wider uppercase whitespace-nowrap transition-all ${activeTab === "overview" ? 'bg-[#A98438] text-white' : 'hover:bg-[#A98438]/5 text-[#111]/70'}`}
            >
              <i className="fa-solid fa-chart-line"></i>
              <span>Overview HUD</span>
            </button>
            <button
              onClick={() => { setActiveTab("departments"); setCurrentPage(1); }}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg text-xs font-semibold tracking-wider uppercase whitespace-nowrap transition-all ${activeTab === "departments" ? 'bg-[#A98438] text-white' : 'hover:bg-[#A98438]/5 text-[#111]/70'}`}
            >
              <i className="fa-solid fa-folder-tree"></i>
              <span>Departments</span>
            </button>
            <button
              onClick={() => { setActiveTab("bookings"); setCurrentPage(1); }}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg text-xs font-semibold tracking-wider uppercase whitespace-nowrap transition-all ${activeTab === "bookings" ? 'bg-[#A98438] text-white' : 'hover:bg-[#A98438]/5 text-[#111]/70'}`}
            >
              <i className="fa-solid fa-receipt"></i>
              <span>Reservations Log</span>
            </button>
          </nav>
        </aside>

        {/* Viewport content */}
        <main className="flex-grow">
          
          {/* TAB 1: OVERVIEW HUD */}
          {activeTab === "overview" && (
            <div className="flex flex-col gap-8 animate-fadeIn">
              
              {/* Stats HUD Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div onClick={() => setActiveTab("bookings")} className="bg-white border border-[#A98438]/10 rounded-xl p-5 cursor-pointer shadow-sm hover:border-[#A98438]/40 transition-all flex items-center gap-5">
                  <div className="h-12 w-12 rounded-full bg-[#A98438]/10 flex items-center justify-center text-lg text-[#A98438]">
                    <i className="fa-solid fa-receipt"></i>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold font-serif">{totalBookingsCount}</h3>
                    <p className="text-[0.68rem] tracking-wider uppercase text-[#111]/45 mt-0.5 font-bold">Total Bookings</p>
                  </div>
                </div>

                <div onClick={() => setActiveTab("bookings")} className="bg-white border border-[#A98438]/10 rounded-xl p-5 cursor-pointer shadow-sm hover:border-[#A98438]/40 transition-all flex items-center gap-5">
                  <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center text-lg text-green-600">
                    <i className="fa-solid fa-calendar-day"></i>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold font-serif">{todayBookingsCount}</h3>
                    <p className="text-[0.68rem] tracking-wider uppercase text-[#111]/45 mt-0.5 font-bold">Today's Bookings</p>
                  </div>
                </div>

                <div onClick={() => setActiveTab("departments")} className="bg-white border border-[#A98438]/10 rounded-xl p-5 cursor-pointer shadow-sm hover:border-[#A98438]/40 transition-all flex items-center gap-5">
                  <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center text-lg text-blue-600">
                    <i className="fa-solid fa-folder-tree"></i>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold font-serif">{activeDeptsCount}</h3>
                    <p className="text-[0.68rem] tracking-wider uppercase text-[#111]/45 mt-0.5 font-bold">Active Departments</p>
                  </div>
                </div>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Popularity Chart */}
                <div className="bg-white border border-[#A98438]/15 rounded-xl p-6 shadow-sm">
                  <h3 className="font-serif font-bold text-lg mb-4 text-[#A98438] flex items-center gap-2 border-b border-[#FAF9F6] pb-2">
                    <i className="fa-solid fa-chart-pie"></i>
                    <span>Material Popularity</span>
                  </h3>
                  <div className="flex flex-col gap-4">
                    {totalBookingsCount === 0 ? (
                      <p className="text-xs text-[#111]/40 text-center py-6">No popularity data loaded.</p>
                    ) : (
                      getDeptPopularityStats().map(item => (
                        <div key={item.id} className="flex flex-col gap-1.5">
                          <div className="flex justify-between text-xs font-semibold">
                            <span>{item.name}</span>
                            <span className="text-[#A98438]">{item.count} ({item.pct}%)</span>
                          </div>
                          <div className="w-full h-2 bg-[#FAF9F6] rounded-full overflow-hidden border border-[#A98438]/5">
                            <div className="h-full bg-gradient-to-r from-[#A98438]/60 to-[#A98438] rounded-full" style={{ width: `${item.pct}%` }}></div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Status Breakdown Chart */}
                <div className="bg-white border border-[#A98438]/15 rounded-xl p-6 shadow-sm">
                  <h3 className="font-serif font-bold text-lg mb-4 text-[#A98438] flex items-center gap-2 border-b border-[#FAF9F6] pb-2">
                    <i className="fa-solid fa-chart-column"></i>
                    <span>Reservation Status Breakdown</span>
                  </h3>
                  <div className="flex flex-col gap-4">
                    {totalBookingsCount === 0 ? (
                      <p className="text-xs text-[#111]/40 text-center py-6">No status data loaded.</p>
                    ) : (
                      getStatusBreakdownStats().map(item => {
                        const colors = {
                          "New": "from-blue-400 to-blue-600",
                          "Approved": "from-green-400 to-green-600",
                          "Cancelled": "from-red-400 to-red-600",
                          "No Show": "from-yellow-400 to-yellow-600"
                        };
                        const barColor = colors[item.status] || "from-[#A98438] to-[#A98438]";
                        return (
                          <div key={item.status} className="flex flex-col gap-1.5">
                            <div className="flex justify-between text-xs font-semibold">
                              <span>{item.status}</span>
                              <span>{item.count} ({item.pct}%)</span>
                            </div>
                            <div className="w-full h-2 bg-[#FAF9F6] rounded-full overflow-hidden border border-[#A98438]/5">
                              <div className={`h-full bg-gradient-to-r ${barColor} rounded-full`} style={{ width: `${item.pct}%` }}></div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

              </div>

              {/* Recent consultations */}
              <div className="bg-white border border-[#A98438]/10 rounded-xl p-6 shadow-sm">
                <h3 className="font-serif font-bold text-lg mb-4 text-[#111]">Recent priority consultations</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#FAF9F6] text-[#111]/40 text-xs text-left uppercase tracking-wider">
                        <th className="pb-3 font-semibold">Ref Code</th>
                        <th className="pb-3 font-semibold">Client Name</th>
                        <th className="pb-3 font-semibold">Phone</th>
                        <th className="pb-3 font-semibold">Department</th>
                        <th className="pb-3 font-semibold">Schedule</th>
                        <th className="pb-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.slice(-5).reverse().map((b) => {
                        const statusColors = {
                          "Approved": "bg-green-500/10 text-green-600",
                          "Cancelled": "bg-red-500/10 text-red-500",
                          "No Show": "bg-yellow-500/10 text-yellow-600",
                          "New": "bg-blue-500/10 text-blue-600"
                        };
                        const badgeStyle = statusColors[b.status] || "bg-gray-500/10 text-gray-500";
                        const dept = departments.find(d => d.id === b.serviceCategory);
                        const deptName = dept ? dept.name : (b.serviceCategory || "Showroom");

                        return (
                          <tr key={b.referenceCode} className="border-b border-[#FAF9F6]/5 hover:bg-[#FAF9F6]/2 cursor-pointer" onClick={() => setActiveTab("bookings")}>
                            <td className="py-3.5 font-mono font-semibold text-[#A98438]">{b.referenceCode}</td>
                            <td className="py-3.5 font-semibold">{b.name}</td>
                            <td className="py-3.5 text-[#111]/60">{b.phone}</td>
                            <td className="py-3.5"><span className="bg-[#A98438]/5 border border-[#A98438]/10 text-[#A98438] text-[0.7rem] px-2 py-0.5 rounded font-bold">{deptName}</span></td>
                            <td className="py-3.5 text-[#111]/70">{b.date} ({b.slot})</td>
                            <td className="py-3.5"><span className={`text-[0.68rem] tracking-wider uppercase px-2.5 py-1 rounded font-bold ${badgeStyle}`}>{b.status}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: DEPARTMENTS CRUD */}
          {activeTab === "departments" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn">
              
              {/* Left Column: Department List */}
              <div className="lg:col-span-2 bg-white border border-[#A98438]/10 rounded-xl p-6 shadow-sm">
                <h3 className="font-serif font-bold text-lg mb-4 text-[#A98438]">Active Showroom Departments</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#FAF9F6] text-[#111]/40 text-xs text-left uppercase tracking-wider">
                        <th className="pb-3 font-semibold">ID</th>
                        <th className="pb-3 font-semibold">Name</th>
                        <th className="pb-3 font-semibold">Description</th>
                        <th className="pb-3 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {departments.map(d => (
                        <tr key={d.id} className="border-b border-[#FAF9F6]/5">
                          <td className="py-4 font-mono text-xs">{d.id}</td>
                          <td className="py-4 font-semibold flex items-center gap-2">
                            <i className={`${d.icon} text-[#A98438]`}></i>
                            <span>{d.name}</span>
                          </td>
                          <td className="py-4 text-[#111]/60 text-xs leading-relaxed max-w-[200px] whitespace-normal">{d.desc}</td>
                          <td className="py-4">
                            <button
                              onClick={() => handleDeleteDepartment(d.id)}
                              className="text-xs uppercase tracking-wider text-red-500 hover:text-red-600 transition-colors font-bold"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Column: Add Form */}
              <div className="bg-white border border-[#A98438]/15 rounded-xl p-6 shadow-sm h-fit">
                <h3 className="font-serif font-bold text-lg mb-4 text-[#A98438]">Create Department</h3>
                <form onSubmit={handleCreateDepartment} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[0.68rem] uppercase tracking-widest text-[#111]/40 font-bold">Department ID *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. tiles"
                      value={newDept.id}
                      onChange={(e) => setNewDept(prev => ({ ...prev, id: e.target.value }))}
                      className="bg-[#FAF9F6] border border-[#A98438]/20 rounded-lg p-3 text-sm text-[#111] outline-none focus:border-[#A98438] transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[0.68rem] uppercase tracking-widest text-[#111]/40 font-bold">Department Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Slabs & Tiles"
                      value={newDept.name}
                      onChange={(e) => setNewDept(prev => ({ ...prev, name: e.target.value }))}
                      className="bg-[#FAF9F6] border border-[#A98438]/20 rounded-lg p-3 text-sm text-[#111] outline-none focus:border-[#A98438] transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[0.68rem] uppercase tracking-widest text-[#111]/40 font-bold">Short Description</label>
                    <input
                      type="text"
                      placeholder="e.g. large porcelain slabs..."
                      value={newDept.desc}
                      onChange={(e) => setNewDept(prev => ({ ...prev, desc: e.target.value }))}
                      className="bg-[#FAF9F6] border border-[#A98438]/20 rounded-lg p-3 text-sm text-[#111] outline-none focus:border-[#A98438] transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[0.68rem] uppercase tracking-widest text-[#111]/40 font-bold">Icon Class</label>
                    <input
                      type="text"
                      placeholder="e.g. fa-solid fa-shapes"
                      value={newDept.icon}
                      onChange={(e) => setNewDept(prev => ({ ...prev, icon: e.target.value }))}
                      className="bg-[#FAF9F6] border border-[#A98438]/20 rounded-lg p-3 text-sm text-[#111] outline-none focus:border-[#A98438] transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    className="bg-[#A98438] text-white font-semibold text-xs tracking-widest uppercase py-3 rounded hover:brightness-110 active:scale-95 transition-all mt-2"
                  >
                    Save Department
                  </button>
                </form>
              </div>

            </div>
          )}

          {/* TAB 3: RESERVATIONS LOG */}
          {activeTab === "bookings" && (
            <div className="bg-white border border-[#A98438]/10 rounded-xl p-6 shadow-sm animate-fadeIn flex flex-col gap-6">
              <h3 className="font-serif font-bold text-lg text-[#A98438] border-b border-[#FAF9F6] pb-2">Priority Concierge Booking Records</h3>

              {/* Filters Bar */}
              <div className="flex flex-wrap gap-4 bg-[#FAF9F6] border border-[#A98438]/10 p-4 rounded-lg items-end">
                <div className="flex-grow min-w-[200px] flex flex-col gap-1">
                  <label className="text-[0.65rem] uppercase tracking-wider text-[#111]/40 font-bold">Search Client / Phone / Ref</label>
                  <input
                    type="text"
                    placeholder="Search name, phone or code..."
                    value={searchVal}
                    onChange={(e) => { setSearchVal(e.target.value); setCurrentPage(1); }}
                    className="bg-white border border-[#A98438]/20 rounded-lg p-2.5 text-xs text-[#111] outline-none focus:border-[#A98438] transition-all"
                  />
                </div>
                
                <div className="w-40 flex flex-col gap-1">
                  <label className="text-[0.65rem] uppercase tracking-wider text-[#111]/40 font-bold">Filter by Date</label>
                  <input
                    type="date"
                    value={dateVal}
                    onChange={(e) => { setDateVal(e.target.value); setCurrentPage(1); }}
                    className="bg-white border border-[#A98438]/20 rounded-lg p-2.5 text-xs text-[#111] outline-none focus:border-[#A98438] transition-all"
                  />
                </div>

                <div className="w-48 flex flex-col gap-1">
                  <label className="text-[0.65rem] uppercase tracking-wider text-[#111]/40 font-bold">Filter by Department</label>
                  <select
                    value={deptVal}
                    onChange={(e) => { setDeptVal(e.target.value); setCurrentPage(1); }}
                    className="bg-white border border-[#A98438]/20 rounded-lg p-2.5 text-xs text-[#111] outline-none focus:border-[#A98438] transition-all"
                  >
                    <option value="">-- All Departments --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => { setSearchVal(""); setDateVal(""); setDeptVal(""); setCurrentPage(1); }}
                  className="bg-white border border-[#A98438]/30 text-[#A98438] hover:bg-[#FAF9F6] text-xs font-semibold py-2.5 px-4 rounded-lg flex items-center gap-1.5 transition-all h-fit"
                >
                  <i className="fa-solid fa-rotate-left"></i>
                  <span>Reset</span>
                </button>
              </div>

              {/* Log Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#FAF9F6] text-[#111]/40 text-xs text-left uppercase tracking-wider">
                      <th className="pb-3 font-semibold">Booked On</th>
                      <th className="pb-3 font-semibold">Ref Code</th>
                      <th className="pb-3 font-semibold">Client Name</th>
                      <th className="pb-3 font-semibold">Phone</th>
                      <th className="pb-3 font-semibold">Showroom Department</th>
                      <th className="pb-3 font-semibold">Scheduled Date & Slot</th>
                      <th className="pb-3 font-semibold">Notes</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedBookings.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-8 text-xs text-[#111]/40 font-medium">
                          No reservation bookings found matching filters.
                        </td>
                      </tr>
                    ) : (
                      paginatedBookings.map(b => {
                        const statusColors = {
                          "Approved": "bg-green-500/10 text-green-600",
                          "Cancelled": "bg-red-500/10 text-red-500",
                          "No Show": "bg-yellow-500/10 text-yellow-600",
                          "New": "bg-blue-500/10 text-blue-600"
                        };
                        const badgeStyle = statusColors[b.status] || "bg-gray-500/10 text-gray-500";
                        const deptName = departments.find(d => d.id === b.serviceCategory)?.name || b.serviceCategory;

                        return (
                          <tr key={b.referenceCode} className="border-b border-[#FAF9F6]/5 hover:bg-[#FAF9F6]/2">
                            <td className="py-4 text-[0.72rem] text-[#111]/50">{b.timestamp || "-"}</td>
                            <td className="py-4 font-mono font-bold text-[#A98438]">{b.referenceCode}</td>
                            <td className="py-4 font-semibold">{b.name}</td>
                            <td className="py-4 font-mono text-xs"><a href={`tel:${b.phone}`} className="text-[#A98438] hover:underline font-semibold">{b.phone}</a></td>
                            <td className="py-4">
                              <span className="font-semibold text-xs block">{deptName}</span>
                              <span className="text-[0.65rem] text-[#111]/40 font-mono">{b.serviceCategory}</span>
                            </td>
                            <td className="py-4">
                              <span className="font-bold text-xs block">{b.date}</span>
                              <span className="text-[0.65rem] uppercase tracking-wider text-[#111]/50 font-bold block mt-0.5">{b.slot === "noon" ? "11:30 AM" : "3:00 PM"}</span>
                            </td>
                            <td className="py-4 text-[0.78rem] max-w-[150px] whitespace-normal leading-relaxed text-[#111]/60">{b.notes || "-"}</td>
                            <td className="py-4"><span className={`text-[0.68rem] tracking-wider uppercase px-2.5 py-1 rounded font-bold ${badgeStyle}`}>{b.status}</span></td>
                            <td className="py-4">
                              <div className="flex flex-col gap-1.5 items-center">
                                {b.status === "New" && (
                                  <>
                                    <button
                                      onClick={() => handleApprove(b.referenceCode)}
                                      className="bg-green-600 text-white text-[0.68rem] font-bold py-1 px-3 rounded hover:brightness-110 active:scale-95 transition-all w-20 flex items-center justify-center gap-1"
                                    >
                                      <i className="fa-solid fa-check"></i>
                                      <span>Approve</span>
                                    </button>
                                    <button
                                      onClick={() => handleCancel(b.referenceCode)}
                                      className="bg-red-500 text-white text-[0.68rem] font-bold py-1 px-3 rounded hover:brightness-110 active:scale-95 transition-all w-20 flex items-center justify-center gap-1"
                                    >
                                      <i className="fa-solid fa-times"></i>
                                      <span>Cancel</span>
                                    </button>
                                  </>
                                )}
                                {b.status === "Approved" && (
                                  <button
                                    onClick={() => handleCancel(b.referenceCode)}
                                    className="border border-red-500/30 text-red-500 text-[0.68rem] font-bold py-1 px-3 rounded hover:bg-red-500/5 active:scale-95 transition-all w-20"
                                  >
                                    Cancel
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex justify-between items-center border-t border-[#FAF9F6] pt-4">
                  <span className="text-xs text-[#111]/50">
                    Showing {(currentPage - 1) * recordsPerPage + 1}-{Math.min(currentPage * recordsPerPage, filteredBookings.length)} of {filteredBookings.length} records
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => prev - 1)}
                      className="border border-[#A98438]/20 text-[#A98438] hover:bg-[#FAF9F6] text-xs font-semibold py-1.5 px-3.5 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      Previous
                    </button>
                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => prev + 1)}
                      className="border border-[#A98438]/20 text-[#A98438] hover:bg-[#FAF9F6] text-xs font-semibold py-1.5 px-3.5 rounded disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* Floating Toast Notification alerts */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50 pointer-events-none max-w-sm w-full px-4">
        {toasts.map(toast => {
          const dept = departments.find(d => d.id === toast.booking.serviceCategory);
          const deptName = dept ? dept.name : (toast.booking.serviceCategory || "Showroom");
          return (
            <div
              key={toast.id}
              onClick={() => {
                setActiveTab("bookings");
                setSearchVal(toast.booking.referenceCode);
                setDateVal("");
                setDeptVal("");
                setCurrentPage(1);
                setToasts(prev => prev.filter(t => t.id !== toast.id));
              }}
              className="bg-white border border-[#A98438]/30 rounded-xl p-4 shadow-2xl flex items-start gap-4 pointer-events-auto cursor-pointer animate-slideInRight"
            >
              <div className="h-10 w-10 rounded-full bg-[#A98438]/10 flex items-center justify-center text-lg text-[#A98438] flex-shrink-0">
                <i className="fa-solid fa-bell animate-bounce"></i>
              </div>
              <div className="flex-grow">
                <h4 className="text-xs font-bold text-[#111]">New VIP Booking!</h4>
                <p className="text-[0.7rem] text-[#111]/60 leading-relaxed mt-0.5">
                  <strong>{toast.booking.name}</strong> booked {toast.booking.slot === "noon" ? "Noon" : "Afternoon"} session on {toast.booking.date} for {deptName}.
                </p>
                <span className="text-[0.62rem] text-[#A98438] font-bold block mt-1">Ref: {toast.booking.referenceCode}</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setToasts(prev => prev.filter(t => t.id !== toast.id));
                }}
                className="text-xs text-[#111]/30 hover:text-[#111]/70"
              >
                <i className="fa-solid fa-times"></i>
              </button>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <footer className="px-6 md:px-12 py-6 border-t border-[#A98438]/10 text-center text-xs text-[#111]/45">
        <span>&copy; {new Date().getFullYear()} Le Marble Gallery. Liaison Suite Admin Portal.</span>
      </footer>

    </div>
  );
}
