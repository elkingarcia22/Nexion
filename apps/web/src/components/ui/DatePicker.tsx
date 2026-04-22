"use client";

import { useState, useRef, useEffect } from "react";

interface DatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
}

const DAYS_ES = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];
const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isToday(d: Date) {
  return isSameDay(d, new Date());
}

function getCalendarDays(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  // Monday-based: getDay() returns 0=Sun…6=Sat → shift to 0=Mon
  const startDow = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array(startDow).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d));
  }
  // pad to full rows of 7
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function DatePicker({ value, onChange }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(value.getFullYear());
  const [viewMonth, setViewMonth] = useState(value.getMonth());
  const ref = useRef<HTMLDivElement>(null);

  // Keep view in sync when value changes externally
  useEffect(() => {
    setViewYear(value.getFullYear());
    setViewMonth(value.getMonth());
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const cells = getCalendarDays(viewYear, viewMonth);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const handleSelect = (d: Date) => {
    onChange(d);
    setOpen(false);
  };

  const displayDate = value.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const displayCapitalized = displayDate.charAt(0).toUpperCase() + displayDate.slice(1);

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2 text-sm text-navy font-medium hover:text-primary transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        {displayCapitalized}
      </button>

      {/* Dropdown calendar */}
      {open && (
        <div
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-72 rounded-2xl border border-border/20 shadow-2xl overflow-hidden"
          style={{ background: "white" }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ background: "linear-gradient(135deg, #1a6bff 0%, #2ec6ff 100%)" }}
          >
            <button
              onClick={prevMonth}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span className="text-sm font-bold text-white tracking-wide">
              {MONTHS_ES[viewMonth]} {viewYear}
            </span>
            <button
              onClick={nextMonth}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          {/* Days of week */}
          <div className="grid grid-cols-7 px-3 pt-3 pb-1">
            {DAYS_ES.map((d) => (
              <div key={d} className="text-center text-[10px] font-bold text-navy/30 tracking-widest pb-1">
                {d}
              </div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 px-3 pb-3 gap-y-0.5">
            {cells.map((day, i) => {
              if (!day) {
                return <div key={`empty-${i}`} />;
              }
              const selected = isSameDay(day, value);
              const today = isToday(day);
              const future = day > new Date();

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => !future && handleSelect(day)}
                  disabled={future}
                  className={`
                    h-9 w-full flex items-center justify-center rounded-xl text-sm font-medium transition-all
                    ${selected
                      ? "text-white shadow-md"
                      : today
                      ? "text-primary font-bold border border-primary/30 bg-primary/5"
                      : future
                      ? "text-navy/20 cursor-not-allowed"
                      : "text-navy/70 hover:bg-primary/8 hover:text-primary"
                    }
                  `}
                  style={selected ? { background: "linear-gradient(135deg, #1a6bff 0%, #2ec6ff 100%)" } : {}}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          {/* Footer — quick jump */}
          <div className="border-t border-border/10 px-3 py-2.5 flex justify-between items-center">
            <button
              onClick={() => handleSelect(new Date())}
              className="text-xs font-semibold text-primary hover:underline transition-all"
            >
              Hoy
            </button>
            <span className="text-[10px] text-navy/30 font-medium">
              {value.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
