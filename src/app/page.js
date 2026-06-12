"use client";

import { useEffect, useRef, useState } from "react";
import db from "@/lib/db";
import * as THREE from "three";

export default function CustomerScheduler() {
  const mountRef = useRef(null);
  const [step, setStep] = useState(1);
  const [departments, setDepartments] = useState([]);
  
  // Booking Form State
  const [bookingState, setBookingState] = useState({
    serviceCategory: "marble", // default
    selectedDate: "",
    selectedSlot: "",
    clientName: "",
    clientPhone: "",
    clientNotes: "",
    referenceCode: ""
  });

  const [dateList, setDateList] = useState([]);
  const [activeBookings, setActiveBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // References to pass into Three.js animations
  const threeState = useRef({
    currentCategory: "marble",
    targetScale: 1.0,
    currentScale: 1.0,
    activeMesh: null,
    materials: {},
    geometries: {},
    scene: null,
    mouseX: 0,
    mouseY: 0
  });

  // Load baseline configurations
  useEffect(() => {
    setDepartments(db.getDepartments());
    setActiveBookings(db.getBookings());

    // Generate upcoming dates (14 days ahead, bypassing today for setup)
    const dates = [];
    for (let i = 1; i <= 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split("T")[0]);
    }
    setDateList(dates);
    
    // Set default tomorrow date
    setBookingState(prev => ({
      ...prev,
      selectedDate: dates[0]
    }));

    setLoading(false);
  }, []);

  // Update Three.js target when category state changes
  useEffect(() => {
    threeState.current.currentCategory = bookingState.serviceCategory;
    // Trigger morph scale transition: shrink first
    threeState.current.targetScale = 0.0;
  }, [bookingState.serviceCategory]);

  // Three.js Ambient Viewport Engine Setup
  useEffect(() => {
    if (loading || !mountRef.current) return;

    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene & Renderer
    const scene = new THREE.Scene();
    threeState.current.scene = scene;
    
    // Alpha true for transparent integration matching globals.css dark background
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0.2, 5.5);

    // 3. Ambient & Luxury Spotlight System
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.12);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);

    // Golden spotlight to reflect premium brass aesthetic
    const goldSpotlight = new THREE.SpotLight(0xa98438, 7, 15, Math.PI / 4, 0.5, 1);
    goldSpotlight.position.set(-2, 4, 3);
    goldSpotlight.castShadow = true;
    scene.add(goldSpotlight);

    // Soft secondary light for ambient fill
    const fillLight = new THREE.DirectionalLight(0x4a5d6e, 0.4);
    fillLight.position.set(-5, -2, -2);
    scene.add(fillLight);

    // 4. Luxury Material Procedural Formats
    const materials = {
      marble: new THREE.MeshStandardMaterial({
        color: 0xfaf9f6,
        roughness: 0.15,
        metalness: 0.1,
        bumpScale: 0.02,
        clearcoat: 1.0,
        clearcoatRoughness: 0.1
      }),
      granite: new THREE.MeshStandardMaterial({
        color: 0x242d34,
        roughness: 0.35,
        metalness: 0.7,
        clearcoat: 0.8
      }),
      baths: new THREE.MeshStandardMaterial({
        color: 0xa98438,
        roughness: 0.1,
        metalness: 0.9,
        clearcoat: 1.0
      }),
      tiles: new THREE.MeshStandardMaterial({
        color: 0x3d484f,
        roughness: 0.6,
        metalness: 0.2
      }),
      complete: new THREE.MeshStandardMaterial({
        color: 0xa98438,
        roughness: 0.2,
        metalness: 0.4
      })
    };
    threeState.current.materials = materials;

    // 5. Geometries Definitions
    const geometries = {
      marble: new THREE.BoxGeometry(2.2, 1.4, 0.12),
      granite: new THREE.BoxGeometry(2.0, 1.3, 0.16),
      baths: new THREE.CylinderGeometry(0.5, 0.5, 1.6, 32),
      tiles: new THREE.BoxGeometry(0.8, 0.8, 0.08),
      complete: new THREE.BoxGeometry(1.0, 1.0, 1.0)
    };
    threeState.current.geometries = geometries;

    // Helper: Create Category Specific Meshes
    function createCategoryMesh(category) {
      if (category === "tiles") {
        // Create an arranged layout of tiles
        const tileGroup = new THREE.Group();
        for (let x = -1; x <= 1; x += 1) {
          for (let y = -1; y <= 1; y += 1) {
            const tile = new THREE.Mesh(geometries.tiles, materials.tiles);
            tile.position.set(x * 0.9, y * 0.9, 0);
            tile.rotation.z = 0.05;
            tileGroup.add(tile);
          }
        }
        return tileGroup;
      } else if (category === "complete") {
        // Create abstract architectural boxes nested
        const layoutGroup = new THREE.Group();
        const baseBox = new THREE.Mesh(geometries.complete, materials.complete);
        layoutGroup.add(baseBox);

        const subBox = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.6, 0.6), new THREE.MeshStandardMaterial({ color: 0x181816, roughness: 0.1, metalness: 0.9 }));
        subBox.position.set(0.6, 0.3, 0.3);
        layoutGroup.add(subBox);

        const accentBox = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 1.2), materials.complete);
        accentBox.position.set(0, 0.7, 0);
        layoutGroup.add(accentBox);
        return layoutGroup;
      } else {
        // Normal single mesh
        return new THREE.Mesh(geometries[category], materials[category]);
      }
    }

    // Initialize initial marble mesh
    let activeMesh = createCategoryMesh("marble");
    scene.add(activeMesh);
    threeState.current.activeMesh = activeMesh;

    // Mouse interactive sways tracker
    const handleMouseMove = (e) => {
      threeState.current.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      threeState.current.mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("mousemove", handleMouseMove);

    // Animation ticking engine
    let animationFrameId;
    let morphStage = "idle"; // "shrinking" or "growing"

    const tick = () => {
      // 1. Gently Rotate Mesh
      if (activeMesh) {
        activeMesh.rotation.y += 0.004;
        activeMesh.rotation.x = Math.sin(Date.now() * 0.0005) * 0.1;
        
        // Gentle mouse follow sway
        activeMesh.rotation.y += threeState.current.mouseX * 0.2;
        activeMesh.rotation.x += threeState.current.mouseY * 0.2;
      }

      // 2. Morph transition processing
      let scale = threeState.current.currentScale;
      const target = threeState.current.targetScale;

      if (Math.abs(scale - target) > 0.01) {
        // Interpolate scale
        scale += (target - scale) * 0.15;
        threeState.current.currentScale = scale;
        if (activeMesh) {
          activeMesh.scale.set(scale, scale, scale);
        }
      } else {
        // If scale reached 0, perform replacement and grow
        if (target === 0.0) {
          scene.remove(activeMesh);
          
          const nextCat = threeState.current.currentCategory;
          activeMesh = createCategoryMesh(nextCat);
          activeMesh.scale.set(0.01, 0.01, 0.01);
          scene.add(activeMesh);
          
          threeState.current.activeMesh = activeMesh;
          threeState.current.currentScale = 0.01;
          threeState.current.targetScale = 1.0;
        }
      }

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(tick);
    };

    tick();

    // Resize viewport handling
    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // Cleanups on unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      // Dispose materials & geometries
      Object.values(materials).forEach(m => m.dispose());
      Object.values(geometries).forEach(g => g.dispose());
    };
  }, [loading]);

  // Determine slot capacities based on overall scheduler state
  const getSlotStatus = (date) => {
    if (!date) return { noon: "Available", afternoon: "Available" };
    
    const noonCount = activeBookings.filter(
      b => b.date === date && b.slot === "noon" && b.status !== "Cancelled" && b.status !== "No Show"
    ).length;

    const afternoonCount = activeBookings.filter(
      b => b.date === date && b.slot === "afternoon" && b.status !== "Cancelled" && b.status !== "No Show"
    ).length;

    return {
      noon: noonCount >= 3 ? "Booked" : `${3 - noonCount} slots left`,
      afternoon: afternoonCount >= 3 ? "Booked" : `${3 - afternoonCount} slots left`
    };
  };

  const currentSlots = getSlotStatus(bookingState.selectedDate);

  // Form submission wizard handlers
  const handleNextStep = () => {
    if (step === 1 && !bookingState.serviceCategory) {
      alert("Please select a showroom department to continue.");
      return;
    }
    if (step === 2) {
      if (!bookingState.selectedSlot) {
        alert("Please pick an available session slot to continue.");
        return;
      }
      if (currentSlots[bookingState.selectedSlot] === "Booked") {
        alert("Selected session slot is fully booked. Please choose another date or session.");
        return;
      }
    }
    setStep(prev => prev + 1);
  };

  const handleBackStep = () => {
    setStep(prev => prev - 1);
  };

  const handleBookingSubmit = (e) => {
    e.preventDefault();
    if (!bookingState.clientName.trim()) {
      alert("Client name is required.");
      return;
    }
    if (!bookingState.clientPhone.trim()) {
      alert("Valid contact phone number is required.");
      return;
    }

    const confCode = "MG-" + Math.floor(100000 + Math.random() * 900000);
    const bookingRecord = {
      referenceCode: confCode,
      consultationType: "showroom_walkthrough",
      serviceCategory: bookingState.serviceCategory,
      executive: "showroom",
      date: bookingState.selectedDate,
      slot: bookingState.selectedSlot,
      name: bookingState.clientName.trim(),
      phone: bookingState.clientPhone.trim(),
      notes: bookingState.clientNotes.trim(),
      timestamp: new Date().toLocaleString(),
      status: "New"
    };

    // Save record to dynamic mock store
    db.saveBooking(bookingRecord);

    setBookingState(prev => ({
      ...prev,
      referenceCode: confCode
    }));

    setStep(4);
  };

  // dynamic helper to build WhatsApp care integration links
  const getWhatsAppCareLink = () => {
    const phoneNo = "919895225599";
    const selectedDept = departments.find(d => d.id === bookingState.serviceCategory);
    const deptName = selectedDept ? selectedDept.name : bookingState.serviceCategory;
    const dateText = new Date(bookingState.selectedDate).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
    const slotText = bookingState.selectedSlot === "noon" ? "Noon (11:30 AM)" : "Afternoon (3:00 PM)";

    const chatMsg = `Hello Le Marble Gallery Care. I have registered a Showroom Reservation.\nRef: ${bookingState.referenceCode}\nName: ${bookingState.clientName}\nDepartment: ${deptName}\nDate: ${dateText}\nSlot: ${slotText}\nPlease confirm my entry parameters.`;
    return `https://wa.me/${phoneNo}?text=${encodeURIComponent(chatMsg)}`;
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#111] text-white">
        <div className="text-center">
          <i className="fa-solid fa-spinner fa-spin text-4xl text-[#A98438] mb-3"></i>
          <p className="font-serif italic text-lg text-[#FAF9F6]">Entering Luxury Showroom...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111] text-[#FAF9F6] font-sans flex flex-col justify-between overflow-x-hidden relative">
      
      {/* Background Decorative Mesh Ornaments */}
      <div className="absolute top-0 right-0 w-[40%] h-[100%] bg-gradient-to-l from-[#181816] to-transparent pointer-events-none z-0"></div>

      {/* Global Header */}
      <header className="px-6 md:px-12 py-6 flex justify-between items-center border-b border-[#FAF9F6]/10 backdrop-blur-md sticky top-0 z-50 bg-[#111]/80">
        <div className="flex items-center gap-4">
          <svg className="h-9 w-auto text-[#A98438]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 82 40">
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
          <div className="flex flex-col">
            <span className="font-serif font-semibold text-sm tracking-[0.2em] uppercase text-[#FAF9F6]">LE MARBLE GALLERY</span>
            <span className="text-[0.62rem] tracking-[0.3em] uppercase text-[#A98438] font-medium">VIP CONCIERGE RESORT</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a href="/front-office" className="text-xs uppercase tracking-wider text-[#A98438] hover:text-[#FAF9F6] border border-[#A98438]/30 px-3 py-1.5 rounded-full transition-all">
            Front Desk Portal
          </a>
          <a href="/admin" className="text-xs uppercase tracking-wider text-[#A98438] hover:text-[#FAF9F6] border border-[#A98438]/30 px-3 py-1.5 rounded-full transition-all">
            Admin Suite
          </a>
        </div>
      </header>

      {/* Main Split Grid (Booking flow left, 3D Canvas Right) */}
      <main className="flex-grow grid grid-cols-1 lg:grid-cols-2 max-w-[1400px] w-full mx-auto px-6 md:px-12 py-10 gap-10 items-center z-10 relative">
        
        {/* Left Side: Booking Wizard Panels */}
        <div className="flex flex-col gap-6">
          
          {/* Stepper Status Indicators */}
          {step <= 3 && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 1 ? 'bg-[#A98438] text-[#111]' : 'border border-[#FAF9F6]/30 text-[#FAF9F6]/50'}`}>1</span>
                <span className="text-xs uppercase tracking-widest hidden md:inline font-semibold">Scope</span>
              </div>
              <div className="h-[1px] w-8 bg-[#FAF9F6]/20"></div>
              <div className="flex items-center gap-2">
                <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 2 ? 'bg-[#A98438] text-[#111]' : 'border border-[#FAF9F6]/30 text-[#FAF9F6]/50'}`}>2</span>
                <span className="text-xs uppercase tracking-widest hidden md:inline font-semibold">Date</span>
              </div>
              <div className="h-[1px] w-8 bg-[#FAF9F6]/20"></div>
              <div className="flex items-center gap-2">
                <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${step >= 3 ? 'bg-[#A98438] text-[#111]' : 'border border-[#FAF9F6]/30 text-[#FAF9F6]/50'}`}>3</span>
                <span className="text-xs uppercase tracking-widest hidden md:inline font-semibold">Contact</span>
              </div>
            </div>
          )}

          {/* Step 1: Showroom Department Scope Selection */}
          {step === 1 && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              <div>
                <h1 className="font-serif italic text-3xl md:text-4xl text-[#FAF9F6] mb-2">Configure Your Showroom Journey</h1>
                <p className="text-sm text-[#FAF9F6]/60">Select the materials category or department scope you wish to consult during your visit.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {departments.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => setBookingState(prev => ({ ...prev, serviceCategory: d.id }))}
                    className={`border rounded-lg p-5 cursor-pointer transition-all duration-300 relative group flex items-start gap-4 ${bookingState.serviceCategory === d.id ? 'border-[#A98438] bg-[#A98438]/5' : 'border-[#FAF9F6]/10 hover:border-[#A98438]/50 hover:bg-[#FAF9F6]/2'}`}
                  >
                    <div className={`text-2xl mt-1 ${bookingState.serviceCategory === d.id ? 'text-[#A98438]' : 'text-[#FAF9F6]/40 group-hover:text-[#A98438]/80'}`}>
                      <i className={d.icon}></i>
                    </div>
                    <div className="flex-grow">
                      <h3 className="font-serif text-lg text-[#FAF9F6] mb-1">{d.name}</h3>
                      <p className="text-xs text-[#FAF9F6]/50 leading-relaxed">{d.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end mt-4">
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="bg-[#A98438] text-[#111] font-semibold text-xs tracking-widest uppercase py-3.5 px-8 rounded hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
                >
                  <span>Select Session Date</span>
                  <i className="fa-solid fa-arrow-right"></i>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Schedule Date & Session Slot */}
          {step === 2 && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              <div>
                <h1 className="font-serif italic text-3xl md:text-4xl text-[#FAF9F6] mb-2">Schedule Session Slot</h1>
                <p className="text-sm text-[#FAF9F6]/60">Pick an available slot for your walkthrough. Slabs are viewed in natural ambient lighting conditions.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Date Picker Input List */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-widest text-[#FAF9F6]/40 font-semibold">Select Session Date</label>
                  <select
                    value={bookingState.selectedDate}
                    onChange={(e) => setBookingState(prev => ({ ...prev, selectedDate: e.target.value, selectedSlot: "" }))}
                    className="bg-[#181816] border border-[#FAF9F6]/10 rounded-lg p-3 text-sm text-[#FAF9F6] outline-none focus:border-[#A98438] transition-all"
                  >
                    {dateList.map((d) => {
                      const formatted = new Date(d).toLocaleDateString("en-US", {
                        weekday: 'short', month: 'short', day: 'numeric'
                      });
                      return <option key={d} value={d}>{formatted}</option>;
                    })}
                  </select>
                </div>

                {/* Session Slots (Noon vs Afternoon) */}
                <div className="flex flex-col gap-3">
                  <label className="text-xs uppercase tracking-widest text-[#FAF9F6]/40 font-semibold">Select Session Slot</label>
                  
                  {/* Noon Session */}
                  <div
                    onClick={() => {
                      if (currentSlots.noon !== "Booked") {
                        setBookingState(prev => ({ ...prev, selectedSlot: "noon" }));
                      }
                    }}
                    className={`border rounded-lg p-4 cursor-pointer transition-all flex justify-between items-center ${currentSlots.noon === "Booked" ? "opacity-40 cursor-not-allowed border-[#FAF9F6]/10 bg-[#FAF9F6]/1" : (bookingState.selectedSlot === "noon" ? "border-[#A98438] bg-[#A98438]/5" : "border-[#FAF9F6]/10 hover:border-[#A98438]/40")}`}
                  >
                    <div>
                      <h4 className="font-serif text-base font-semibold">Noon Session</h4>
                      <p className="text-xs text-[#FAF9F6]/50 mt-0.5">11:30 AM - 01:30 PM</p>
                    </div>
                    <span className={`text-[0.68rem] tracking-wider uppercase px-2.5 py-1 rounded font-bold ${currentSlots.noon === "Booked" ? "bg-red-500/20 text-red-400" : (bookingState.selectedSlot === "noon" ? "bg-[#A98438] text-[#111]" : "bg-[#FAF9F6]/5 text-[#FAF9F6]/60")}`}>
                      {currentSlots.noon}
                    </span>
                  </div>

                  {/* Afternoon Session */}
                  <div
                    onClick={() => {
                      if (currentSlots.afternoon !== "Booked") {
                        setBookingState(prev => ({ ...prev, selectedSlot: "afternoon" }));
                      }
                    }}
                    className={`border rounded-lg p-4 cursor-pointer transition-all flex justify-between items-center ${currentSlots.afternoon === "Booked" ? "opacity-40 cursor-not-allowed border-[#FAF9F6]/10 bg-[#FAF9F6]/1" : (bookingState.selectedSlot === "afternoon" ? "border-[#A98438] bg-[#A98438]/5" : "border-[#FAF9F6]/10 hover:border-[#A98438]/40")}`}
                  >
                    <div>
                      <h4 className="font-serif text-base font-semibold">Afternoon Session</h4>
                      <p className="text-xs text-[#FAF9F6]/50 mt-0.5">03:00 PM - 05:00 PM</p>
                    </div>
                    <span className={`text-[0.68rem] tracking-wider uppercase px-2.5 py-1 rounded font-bold ${currentSlots.afternoon === "Booked" ? "bg-red-500/20 text-red-400" : (bookingState.selectedSlot === "afternoon" ? "bg-[#A98438] text-[#111]" : "bg-[#FAF9F6]/5 text-[#FAF9F6]/60")}`}>
                      {currentSlots.afternoon}
                    </span>
                  </div>

                </div>

              </div>

              <div className="flex justify-between items-center mt-4 border-t border-[#FAF9F6]/10 pt-5">
                <button
                  type="button"
                  onClick={handleBackStep}
                  className="text-xs uppercase tracking-widest text-[#FAF9F6]/60 hover:text-[#FAF9F6] font-semibold transition-all flex items-center gap-1"
                >
                  <i className="fa-solid fa-arrow-left"></i>
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="bg-[#A98438] text-[#111] font-semibold text-xs tracking-widest uppercase py-3.5 px-8 rounded hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
                >
                  <span>Enter Contact Info</span>
                  <i className="fa-solid fa-arrow-right"></i>
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Register Contact Details */}
          {step === 3 && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              <div>
                <h1 className="font-serif italic text-3xl md:text-4xl text-[#FAF9F6] mb-2">Register Client Access</h1>
                <p className="text-sm text-[#FAF9F6]/60">Enter verification coordinates. Access code will be dispatched to register priority entry slots.</p>
              </div>

              <form onSubmit={handleBookingSubmit} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="client-name" className="text-[0.68rem] uppercase tracking-widest text-[#FAF9F6]/40 font-semibold">Client Name *</label>
                    <input
                      type="text"
                      id="client-name"
                      required
                      placeholder="e.g. Mrs. Fareedha"
                      value={bookingState.clientName}
                      onChange={(e) => setBookingState(prev => ({ ...prev, clientName: e.target.value }))}
                      className="bg-[#181816] border border-[#FAF9F6]/10 rounded-lg p-3 text-sm text-[#FAF9F6] outline-none focus:border-[#A98438] transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="client-phone" className="text-[0.68rem] uppercase tracking-widest text-[#FAF9F6]/40 font-semibold">WhatsApp Phone *</label>
                    <input
                      type="tel"
                      id="client-phone"
                      required
                      placeholder="e.g. 9895225599"
                      value={bookingState.clientPhone}
                      onChange={(e) => setBookingState(prev => ({ ...prev, clientPhone: e.target.value }))}
                      className="bg-[#181816] border border-[#FAF9F6]/10 rounded-lg p-3 text-sm text-[#FAF9F6] outline-none focus:border-[#A98438] transition-all"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="client-notes" className="text-[0.68rem] uppercase tracking-widest text-[#FAF9F6]/40 font-semibold">Project Scale & Material Notes</label>
                  <textarea
                    id="client-notes"
                    rows={3}
                    placeholder="e.g. Villa project, needs imported Statuario marble and Artize bath wellness fittings."
                    value={bookingState.clientNotes}
                    onChange={(e) => setBookingState(prev => ({ ...prev, clientNotes: e.target.value }))}
                    className="bg-[#181816] border border-[#FAF9F6]/10 rounded-lg p-3 text-sm text-[#FAF9F6] outline-none focus:border-[#A98438] transition-all resize-none"
                  />
                </div>

                <div className="flex justify-between items-center mt-4 border-t border-[#FAF9F6]/10 pt-5">
                  <button
                    type="button"
                    onClick={handleBackStep}
                    className="text-xs uppercase tracking-widest text-[#FAF9F6]/60 hover:text-[#FAF9F6] font-semibold transition-all flex items-center gap-1"
                  >
                    <i className="fa-solid fa-arrow-left"></i>
                    <span>Back</span>
                  </button>
                  <button
                    type="submit"
                    className="bg-[#A98438] text-[#111] font-semibold text-xs tracking-widest uppercase py-3.5 px-8 rounded hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
                  >
                    <span>Finalize Booking</span>
                    <i className="fa-solid fa-circle-check"></i>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Step 4: Success Ticket & Access Code */}
          {step === 4 && (
            <div className="flex flex-col gap-6 animate-fadeIn">
              <div className="flex flex-col items-center text-center">
                <div className="h-16 w-16 bg-[#A98438]/10 rounded-full flex items-center justify-center text-[#A98438] text-3xl mb-4 border border-[#A98438]/30">
                  <i className="fa-solid fa-circle-check"></i>
                </div>
                <h1 className="font-serif italic text-3xl md:text-4xl text-[#FAF9F6] mb-1">Reservation Confirmed</h1>
                <p className="text-sm text-[#FAF9F6]/60">Your VIP showroom entrance pass has been locked. Here are your verification parameters.</p>
              </div>

              {/* Luxury Ticket Card */}
              <div className="bg-[#181816] border border-[#A98438]/20 rounded-xl p-6 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#A98438]/10 to-transparent pointer-events-none"></div>
                
                {/* Reference Code Ribbon */}
                <div className="flex justify-between items-center border-b border-[#FAF9F6]/10 pb-4 mb-4">
                  <span className="text-xs uppercase tracking-widest text-[#FAF9F6]/40">REFERENCE ID</span>
                  <span className="font-mono text-base font-bold text-[#A98438] tracking-wider">{bookingState.referenceCode}</span>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#FAF9F6]/50">Client Guest</span>
                    <span className="text-xs font-semibold text-[#FAF9F6]">{bookingState.clientName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#FAF9F6]/50">Showroom Scope</span>
                    <span className="text-xs font-semibold text-[#FAF9F6]">
                      {departments.find(d => d.id === bookingState.serviceCategory)?.name || bookingState.serviceCategory}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#FAF9F6]/50">Session Date</span>
                    <span className="text-xs font-semibold text-[#FAF9F6]">
                      {new Date(bookingState.selectedDate).toLocaleDateString("en-US", {
                        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#FAF9F6]/50">Session Time</span>
                    <span className="text-xs font-semibold text-[#FAF9F6]">
                      {bookingState.selectedSlot === "noon" ? "Noon Session (11:30 AM)" : "Afternoon Session (03:00 PM)"}
                    </span>
                  </div>
                </div>

                {/* Ticket Dotted Separator */}
                <div className="my-5 border-t border-dashed border-[#FAF9F6]/10"></div>
                
                <p className="text-[0.7rem] text-[#FAF9F6]/40 text-center leading-relaxed italic">
                  * Entry is reserved strictly for private clients. Please coordinate with front reception using your Reference ID upon arrival.
                </p>
              </div>

              <div className="flex flex-col gap-3 mt-2">
                <a
                  href={getWhatsAppCareLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#25D366] text-white font-semibold text-xs tracking-widest uppercase py-4 px-8 rounded hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-500/10"
                >
                  <i className="fa-brands fa-whatsapp text-lg"></i>
                  <span>Direct Connect Verification</span>
                </a>
                
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setBookingState(prev => ({
                      ...prev,
                      clientName: "",
                      clientPhone: "",
                      clientNotes: "",
                      referenceCode: "",
                      selectedSlot: ""
                    }));
                  }}
                  className="text-xs uppercase tracking-widest text-[#FAF9F6]/60 hover:text-[#FAF9F6] font-semibold py-3 transition-all"
                >
                  Schedule Another Booking
                </button>
              </div>

            </div>
          )}

        </div>

        {/* Right Side: Three.js Ambient Viewport Canvas */}
        <div className="w-full h-[400px] lg:h-[600px] rounded-2xl relative overflow-hidden bg-gradient-to-b from-[#181816]/30 to-[#181816]/10 border border-[#FAF9F6]/5 shadow-inner flex items-center justify-center">
          
          {/* Canvas Mount Container */}
          <div ref={mountRef} className="absolute inset-0 z-10 w-full h-full"></div>

          {/* Luxury Ambient Overlay Text */}
          <div className="absolute bottom-6 left-6 z-20 pointer-events-none flex flex-col">
            <span className="font-serif italic text-lg text-[#FAF9F6]/90 tracking-wide">
              {departments.find(d => d.id === bookingState.serviceCategory)?.name || "Ambient Material"}
            </span>
            <span className="text-[0.62rem] uppercase tracking-widest text-[#A98438] font-bold mt-0.5">
              3D Dynamic Viewport Render
            </span>
          </div>

          <div className="absolute top-6 right-6 z-20 pointer-events-none bg-[#111]/60 backdrop-blur-md border border-[#FAF9F6]/10 px-3 py-1.5 rounded-full text-[0.68rem] tracking-wider text-[#FAF9F6]/60 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 bg-[#A98438] rounded-full animate-pulse"></span>
            <span>interactive mesh story</span>
          </div>

        </div>

      </main>

      {/* Global Footer */}
      <footer className="px-6 md:px-12 py-8 border-t border-[#FAF9F6]/10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-[#FAF9F6]/40 z-10 relative bg-[#111]">
        <span>&copy; {new Date().getFullYear()} Le Marble Gallery. Private Scheduling Suite.</span>
        <div className="flex gap-6">
          <a href="#" className="hover:text-[#FAF9F6] transition-colors">Privacy Parameters</a>
          <a href="#" className="hover:text-[#FAF9F6] transition-colors">Showroom Guidelines</a>
          <a href="#" className="hover:text-[#FAF9F6] transition-colors">System Helpdesk</a>
        </div>
      </footer>

    </div>
  );
}
