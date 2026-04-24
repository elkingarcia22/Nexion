"use client";

import { useState, useRef, useEffect } from "react";

interface DayNavigatorProps {
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
  const startDow = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array(startDow).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(year, month, d));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function DayNavigator({ value, onChange }: DayNavigatorProps) {
  const [openPicker, setOpenPicker] = useState(false);
  const [viewYear, setViewYear] = useState(value.getFullYear());
  const [viewMonth, setViewMonth] = useState(value.getMonth());
  const ref = useRef<HTMLDivElement>(null);

  // Keep view in sync when value changes externally
  useEffect(() => {
    setViewYear(value.getFullYear());
    setViewMonth(value.getMonth());
  }, [value]);

  // Close picker on outside click
  useEffect(() => {
    if (!openPicker) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpenPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openPicker]);

  const cells = getCalendarDays(viewYear, viewMonth);

  const navigateDay = (delta: number) => {
    const next = new Date(value);
    next.setDate(value.getDate() + delta);
    onChange(next);
  };

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (d: Date) => {
    onChange(d);
    setOpenPicker(false);
  };

  const displayDate = value.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const displayCapitalized = displayDate.charAt(0).toUpperCase() + displayDate.slice(1);

  return (
    <div className="relative" ref={ref}>
      {/* Day Navigator Bar — White background with arrow controls */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-white border border-border/20 rounded-xl shadow-soft">
        {/* Prev day button */}
        <button
          onClick={() => navigateDay(-1)}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-navy/40 hover:text-primary hover:bg-primary/8 transition-all"
          title="Día anterior"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Date display — clickable to open picker */}
        <button
          onClick={() => setOpenPicker((o) => !o)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-navy hover:text-primary transition-colors hover:bg-primary/5 rounded-lg"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          {displayCapitalized}
        </button>

        {/* Next day button */}
        <button
          onClick={() => navigateDay(1)}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-navy/40 hover:text-primary hover:bg-primary/8 transition-all"
          title="Día siguiente"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        {/* HOY badge — only shows for current day */}
        {isToday(value) && (
          <span className="ml-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-primary/10 text-primary tracking-wide uppercase">
            Hoy
          </span>
        )}
      </div>

      {/* Dropdown calendar picker */}
      {openPicker && (
        <div
          className="absolute left-0 top-[calc(100%+8px)] z-50 w-72 rounded-2xl border border-border/20 shadow-2xl overflow-hidden"
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
                  onClick={() => !future && handleSelectDay(day)}
                  disabled={future}
                  className={`
                    h-9 w-full flex items-center justify-center rounded-xl text-sm font-medium transition-all
                    ${
                      selected
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

          {/* Footer */}
          <div className="border-t border-border/10 px-3 py-2.5 flex justify-between items-center">
            <button
              onClick={() => handleSelectDay(new Date())}
              className="text-xs font-semibold text-primary hover:underline transition-all"
            >
              Ir a hoy
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
