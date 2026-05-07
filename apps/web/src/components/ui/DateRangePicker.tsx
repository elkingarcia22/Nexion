"use client";

import { useState, useRef, useEffect } from "react";

interface DateRangePickerProps {
  value: { start: Date; end: Date } | null;
  onChange: (range: { start: Date; end: Date } | null) => void;
  label?: string;
  allowFuture?: boolean;
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

function isDateInRange(d: Date, range: { start: Date; end: Date }): boolean {
  return d >= range.start && d <= range.end;
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

export function DateRangePicker({ value, onChange, label, allowFuture = false }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [tempSelection, setTempSelection] = useState<Date | null>(null);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const ref = useRef<HTMLDivElement>(null);

  // Keep view in sync when value changes externally
  useEffect(() => {
    if (value) {
      setViewYear(value.start.getFullYear());
      setViewMonth(value.start.getMonth());
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setTempSelection(null);
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

  const handleDayClick = (d: Date) => {
    const isFuture = d > new Date() && !isToday(d);
    if (isFuture && !allowFuture) return;

    if (!tempSelection) {
      // First click: set start
      setTempSelection(d);
    } else {
      // Second click: set end (with auto-swap)
      let start = tempSelection;
      let end = d;
      if (end < start) {
        [start, end] = [end, start];
      }
      onChange({ start, end });
      setTempSelection(null);
      setOpen(false);
    }
  };

  const handleClear = () => {
    onChange(null);
    setTempSelection(null);
  };

  const handleToday = () => {
    const today = new Date();
    onChange({ start: today, end: today });
    setTempSelection(null);
    setOpen(false);
  };

  // Format trigger text
  let triggerText = label || "Seleccionar rango";
  if (value) {
    const startMonth = MONTHS_ES[value.start.getMonth()].slice(0, 3);
    const endMonth = MONTHS_ES[value.end.getMonth()].slice(0, 3);
    const startDay = value.start.getDate();
    const endDay = value.end.getDate();
    if (value.start.getMonth() === value.end.getMonth() && value.start.getFullYear() === value.end.getFullYear()) {
      triggerText = `${startMonth} ${startDay} – ${endDay}`;
    } else {
      triggerText = `${startMonth} ${startDay} – ${endMonth} ${endDay}`;
    }
  }

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 px-4 py-3 bg-[#161927]/50 rounded-2xl border border-white/5 text-sm text-white font-black hover:border-primary/40 transition-all w-full justify-start"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span className="uppercase tracking-widest text-[11px]">{triggerText}</span>
      </button>

      {/* Dropdown calendar */}
      {open && (
        <div
          className="absolute left-0 bottom-[calc(100%+8px)] z-50 w-72 rounded-2xl border border-white/10 shadow-2xl overflow-hidden backdrop-blur-xl"
          style={{ background: "rgba(22, 25, 39, 0.95)" }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ background: "linear-gradient(135deg, #1a6bff 0%, #2ec6ff 100%)" }}
          >
            <button
              onClick={prevMonth}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-card/15 transition-all"
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
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-card/15 transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          {/* Days of week */}
          <div className="grid grid-cols-7 px-3 pt-3 pb-1">
            {DAYS_ES.map((d) => (
              <div key={d} className="text-center text-[10px] font-bold text-white/30 tracking-widest pb-1">
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

              const isFuture = day > new Date() && !isToday(day);
              const isDisabled = isFuture && !allowFuture;
              const isStartSelection = tempSelection ? isSameDay(day, tempSelection) : false;
              const isEndSelection = value ? (isSameDay(day, value.start) || isSameDay(day, value.end)) : false;
              const isInRange = value && !isStartSelection && !isEndSelection && isDateInRange(day, value);
              const today = isToday(day);

              return (
                <button
                  key={day.toISOString()}
                  onClick={() => !isDisabled && handleDayClick(day)}
                  disabled={isDisabled}
                  className={`
                    h-9 w-full flex items-center justify-center rounded-xl text-sm font-medium transition-all
                    ${isEndSelection
                      ? "text-white shadow-md"
                      : isStartSelection
                      ? "text-white shadow-md border border-primary/50"
                      : isInRange
                      ? "text-primary bg-primary/15"
                      : today
                      ? "text-primary font-bold border border-primary/30 bg-primary/5"
                      : isDisabled
                      ? "text-white/10 cursor-not-allowed"
                      : "text-white/70 hover:bg-primary/8 hover:text-primary"
                    }
                  `}
                  style={isEndSelection ? { background: "linear-gradient(135deg, #1a6bff 0%, #2ec6ff 100%)" } : {}}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="border-t border-white/10 px-3 py-2.5 flex justify-between items-center">
            <div className="flex gap-2">
              <button
                onClick={handleToday}
                className="text-xs font-semibold text-primary hover:underline transition-all"
              >
                Hoy
              </button>
              <button
                onClick={handleClear}
                className="text-xs font-semibold text-white/50 hover:text-white/70 transition-all"
              >
                Limpiar
              </button>
            </div>
            {value && (
              <span className="text-[10px] text-white/30 font-medium">
                {value.start.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })} – {value.end.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
