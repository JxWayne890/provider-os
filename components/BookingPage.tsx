import React, { useState, useEffect } from 'react';
import { Calendar, Clock, ArrowLeft, CheckCircle, User, Mail, Phone, Building2 } from 'lucide-react';

const RELAY_URL = import.meta.env.VITE_RELAY_URL || 'https://provider-os-production.up.railway.app';
const RELAY_AUTH_TOKEN = import.meta.env.VITE_RELAY_AUTH_TOKEN || '';

interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

interface BookingPageProps {
  campaignLeadId?: string;
}

const BookingPage: React.FC<BookingPageProps> = ({ campaignLeadId }) => {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [step, setStep] = useState<'calendar' | 'form' | 'confirming' | 'confirmed'>('calendar');
  const [form, setForm] = useState({ name: '', email: '', phone: '', companyName: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    loadSlots();
  }, []);

  const loadSlots = async () => {
    try {
      const response = await fetch(RELAY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RELAY_AUTH_TOKEN}` },
        body: JSON.stringify({ action: 'get_available_slots' }),
      });
      const data = await response.json();
      if (data.success) {
        setSlots(data.slots || []);
        // Auto-select first available date
        if (data.slots?.length > 0) {
          const firstDate = new Date(data.slots[0].start).toDateString();
          setSelectedDate(firstDate);
        }
      }
    } catch (err) {
      console.warn('Failed to load slots');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedSlot || !form.name || !form.email) return;
    setStep('confirming');
    setError('');
    try {
      const response = await fetch(RELAY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RELAY_AUTH_TOKEN}` },
        body: JSON.stringify({
          action: 'create_booking',
          name: form.name,
          email: form.email,
          phone: form.phone,
          companyName: form.companyName,
          campaignLeadId: campaignLeadId || undefined,
          scheduledAt: selectedSlot.start,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setStep('confirmed');
      } else {
        throw new Error(data.error || 'Booking failed');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
      setStep('form');
    }
  };

  // Group slots by date
  const slotsByDate: Record<string, TimeSlot[]> = {};
  for (const slot of slots) {
    const dateKey = new Date(slot.start).toDateString();
    if (!slotsByDate[dateKey]) slotsByDate[dateKey] = [];
    slotsByDate[dateKey].push(slot);
  }
  const availableDates = Object.keys(slotsByDate);

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-[#FF9F1C] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-[#0B3060] text-white p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-[#FF9F1C] rounded-lg flex items-center justify-center">
              <span className="text-white font-serif text-sm font-bold">P</span>
            </div>
            <span className="text-sm text-gray-400">The Provider System</span>
          </div>
          <h1 className="text-xl font-serif font-bold">Book a 15-Minute Consultation</h1>
          <p className="text-sm text-gray-400 mt-1">Choose a time that works for you</p>
        </div>

        <div className="p-6">
          {/* Step: Calendar */}
          {step === 'calendar' && (
            <>
              {/* Date selector */}
              <div className="flex gap-2 overflow-x-auto pb-3 mb-4 -mx-1 px-1">
                {availableDates.map(dateStr => (
                  <button
                    key={dateStr}
                    onClick={() => { setSelectedDate(dateStr); setSelectedSlot(null); }}
                    className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                      selectedDate === dateStr
                        ? 'bg-[#0B3060] text-white'
                        : 'bg-gray-50 text-[#64748B] hover:bg-gray-100'
                    }`}
                  >
                    {formatDate(dateStr)}
                  </button>
                ))}
              </div>

              {/* Time slots */}
              {selectedDate && slotsByDate[selectedDate] && (
                <div className="grid grid-cols-3 gap-2 mb-6 max-h-64 overflow-y-auto">
                  {slotsByDate[selectedDate].map((slot, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedSlot(slot)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        selectedSlot?.start === slot.start
                          ? 'bg-[#FF9F1C] text-white shadow-md'
                          : 'bg-gray-50 text-[#475569] hover:bg-gray-100'
                      }`}
                    >
                      {formatTime(slot.start)}
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={() => selectedSlot && setStep('form')}
                disabled={!selectedSlot}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                  selectedSlot
                    ? 'bg-[#0B3060] text-white hover:bg-[#0a2850] active:scale-[0.98]'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                Continue
              </button>
            </>
          )}

          {/* Step: Form */}
          {step === 'form' && (
            <>
              <button onClick={() => setStep('calendar')} className="flex items-center gap-1 text-xs text-[#64748B] mb-4 hover:text-[#0B3060]">
                <ArrowLeft size={14} /> Back
              </button>

              <div className="bg-gray-50 rounded-xl p-3 mb-5 flex items-center gap-3">
                <Calendar size={16} className="text-[#FF9F1C]" />
                <span className="text-sm font-medium text-[#0B3060]">
                  {selectedSlot && new Date(selectedSlot.start).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </span>
                <Clock size={14} className="text-[#64748B] ml-auto" />
                <span className="text-sm text-[#64748B]">{selectedSlot && formatTime(selectedSlot.start)}</span>
              </div>

              {error && (
                <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl mb-4">{error}</div>
              )}

              <div className="space-y-3 mb-6">
                <div className="relative">
                  <User size={16} className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text" placeholder="Full Name *" value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-[#E2E8F0] rounded-xl text-sm focus:ring-2 focus:ring-black/5 outline-none"
                  />
                </div>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="email" placeholder="Email *" value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-[#E2E8F0] rounded-xl text-sm focus:ring-2 focus:ring-black/5 outline-none"
                  />
                </div>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="tel" placeholder="Phone" value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-[#E2E8F0] rounded-xl text-sm focus:ring-2 focus:ring-black/5 outline-none"
                  />
                </div>
                <div className="relative">
                  <Building2 size={16} className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text" placeholder="Company Name" value={form.companyName}
                    onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-[#E2E8F0] rounded-xl text-sm focus:ring-2 focus:ring-black/5 outline-none"
                  />
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!form.name || !form.email}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                  form.name && form.email
                    ? 'bg-[#FF9F1C] text-white hover:bg-[#e8900a] active:scale-[0.98] shadow-lg shadow-[#FF9F1C]/20'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                Confirm Booking
              </button>
            </>
          )}

          {/* Step: Confirming */}
          {step === 'confirming' && (
            <div className="text-center py-8">
              <div className="w-10 h-10 border-3 border-[#FF9F1C] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-[#64748B] font-medium text-sm">Confirming your booking...</p>
            </div>
          )}

          {/* Step: Confirmed */}
          {step === 'confirmed' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle size={32} className="text-emerald-600" />
              </div>
              <h2 className="text-xl font-serif font-bold text-[#0B3060] mb-2">You're Booked!</h2>
              <p className="text-sm text-[#64748B] mb-4">Check your email for confirmation details.</p>

              <div className="bg-gray-50 rounded-xl p-4 text-left">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar size={16} className="text-[#FF9F1C]" />
                  <span className="text-sm font-medium">
                    {selectedSlot && new Date(selectedSlot.start).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock size={16} className="text-[#FF9F1C]" />
                  <span className="text-sm text-[#64748B]">{selectedSlot && formatTime(selectedSlot.start)} EST</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingPage;
