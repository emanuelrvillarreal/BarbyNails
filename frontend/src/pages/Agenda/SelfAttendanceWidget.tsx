import { useEffect, useState } from 'react';
import { checkIn, checkOut, fetchAttendance, type AttendanceRecord } from '../../api/staff';
import { today } from './dateUtils';

export default function SelfAttendanceWidget() {
  const [record, setRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(false);

  function load() {
    fetchAttendance(today()).then((entries) => setRecord(entries[0]?.record ?? null));
  }

  useEffect(load, []);

  async function handleCheckIn() {
    setLoading(true);
    try {
      await checkIn();
      load();
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckOut() {
    setLoading(true);
    try {
      await checkOut();
      load();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm">
      {record?.checkInTime ? (
        <span className="text-neutral-500">Llegada: {record.checkInTime.slice(11, 16)}</span>
      ) : (
        <button onClick={handleCheckIn} disabled={loading} className="font-medium text-emerald-600 hover:underline disabled:opacity-50">
          Marcar llegada
        </button>
      )}
      {record?.checkInTime && !record?.checkOutTime && (
        <button onClick={handleCheckOut} disabled={loading} className="font-medium text-pink-600 hover:underline disabled:opacity-50">
          Marcar salida
        </button>
      )}
      {record?.checkOutTime && <span className="text-neutral-500">Salida: {record.checkOutTime.slice(11, 16)}</span>}
    </div>
  );
}
