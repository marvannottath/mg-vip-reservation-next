// Database layer for Next.js - runs safely on client-side (using localStorage) and mocks on server-side

const db = {
    isPureLocalMode: true,
    apiUrl: 'api.php',

    getDepartments() {
        if (typeof window === 'undefined') {
            return [
                { id: 'marble', name: 'Italian Marbles', desc: 'Imported Statuario, Calacatta & natural stones.', icon: 'fa-solid fa-border-all' },
                { id: 'granite', name: 'Premium Granite', desc: 'Premium density natural and textured granites.', icon: 'fa-solid fa-layer-group' },
                { id: 'baths', name: 'Wellness Baths', desc: 'Artize, Jaquar & Grohe wellness smart fixtures.', icon: 'fa-solid fa-bath' },
                { id: 'tiles', name: 'Slab Tiles & Roofs', desc: 'Large porcelain slab tiles & clay roofing slate.', icon: 'fa-solid fa-shapes' },
                { id: 'complete', name: 'Complete Solution', desc: 'Full spectrum custom home project layout.', icon: 'fa-solid fa-house-laptop' }
            ];
        }
        let depts = [];
        try {
            const deptsStr = localStorage.getItem('mg_departments');
            depts = deptsStr ? JSON.parse(deptsStr) : [];
        } catch(e) {}
        if (!Array.isArray(depts) || depts.length === 0) {
            depts = [
                { id: 'marble', name: 'Italian Marbles', desc: 'Imported Statuario, Calacatta & natural stones.', icon: 'fa-solid fa-border-all' },
                { id: 'granite', name: 'Premium Granite', desc: 'Premium density natural and textured granites.', icon: 'fa-solid fa-layer-group' },
                { id: 'baths', name: 'Wellness Baths', desc: 'Artize, Jaquar & Grohe wellness smart fixtures.', icon: 'fa-solid fa-bath' },
                { id: 'tiles', name: 'Slab Tiles & Roofs', desc: 'Large porcelain slab tiles & clay roofing slate.', icon: 'fa-solid fa-shapes' },
                { id: 'complete', name: 'Complete Solution', desc: 'Full spectrum custom home project layout.', icon: 'fa-solid fa-house-laptop' }
            ];
            localStorage.setItem('mg_departments', JSON.stringify(depts));
        }
        return depts;
    },

    getBookings() {
        if (typeof window === 'undefined') return [];
        let bookings = [];
        try {
            const bookingsStr = localStorage.getItem('mg_bookings');
            bookings = bookingsStr ? JSON.parse(bookingsStr) : [];
        } catch(e) {}
        if (!Array.isArray(bookings) || bookings.length === 0) {
            // Seed mock data
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];
            
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            const nextWeekStr = nextWeek.toISOString().split('T')[0];

            bookings = [
                {
                    referenceCode: 'MG-829471',
                    consultationType: 'showroom_walkthrough',
                    serviceCategory: 'marble',
                    executive: 'showroom',
                    date: tomorrowStr,
                    slot: 'noon',
                    name: 'Mrs. Fareedha',
                    phone: '9895225599',
                    notes: 'Villa project in Calicut. Needs imported Statuario & Calacatta gold selection.',
                    timestamp: new Date().toISOString(),
                    status: 'Approved'
                },
                {
                    referenceCode: 'MG-782490',
                    consultationType: 'showroom_walkthrough',
                    serviceCategory: 'granite',
                    executive: 'showroom',
                    date: tomorrowStr,
                    slot: 'afternoon',
                    name: 'Mr. Anoop Krishnan',
                    phone: '9715012345',
                    notes: 'Premium density textured granites for kitchen countertops.',
                    timestamp: new Date().toISOString(),
                    status: 'New'
                },
                {
                    referenceCode: 'MG-910482',
                    consultationType: 'showroom_walkthrough',
                    serviceCategory: 'baths',
                    executive: 'showroom',
                    date: nextWeekStr,
                    slot: 'noon',
                    name: 'Sara Joy (Architect)',
                    phone: '9665123456',
                    notes: 'Wellness Fixtures selection for a luxury penthouse project.',
                    timestamp: new Date().toISOString(),
                    status: 'New'
                }
            ];
            localStorage.setItem('mg_bookings', JSON.stringify(bookings));
        }
        return bookings;
    },

    saveBooking(booking) {
        if (typeof window === 'undefined') return;
        const bookings = this.getBookings();
        bookings.push(booking);
        localStorage.setItem('mg_bookings', JSON.stringify(bookings));
        window.dispatchEvent(new CustomEvent('db-synced'));
    },

    updateBookingStatus(refCode, status, cancelReason = '') {
        if (typeof window === 'undefined') return;
        const bookings = this.getBookings();
        const booking = bookings.find(b => b.referenceCode === refCode);
        if (booking) {
            booking.status = status;
            if (cancelReason) {
                const cleanReason = cancelReason.trim();
                booking.notes = booking.notes ? booking.notes + " | " + cleanReason : cleanReason;
            }
            localStorage.setItem('mg_bookings', JSON.stringify(bookings));
            window.dispatchEvent(new CustomEvent('db-synced'));
        }
    },

    saveDepartment(dept) {
        if (typeof window === 'undefined') return;
        const depts = this.getDepartments();
        const existingIdx = depts.findIndex(d => d.id === dept.id);
        if (existingIdx > -1) {
            depts[existingIdx] = dept;
        } else {
            depts.push(dept);
        }
        localStorage.setItem('mg_departments', JSON.stringify(depts));
        window.dispatchEvent(new CustomEvent('db-synced'));
    },

    deleteDepartment(id) {
        if (typeof window === 'undefined') return;
        let depts = this.getDepartments();
        depts = depts.filter(d => d.id !== id);
        localStorage.setItem('mg_departments', JSON.stringify(depts));
        window.dispatchEvent(new CustomEvent('db-synced'));
    }
};

export default db;
