"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export function Header() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchFocus, setSearchFocus] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
      }
      setLoading(false);
    });
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-border/20 px-8 py-4">
      <div className="flex items-center justify-between gap-8">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <div className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border transition-all ${
            searchFocus
              ? "border-primary bg-light/10"
              : "border-border/20 bg-bg hover:border-border/40"
          }`}>
            <svg
              className="w-5 h-5 text-navy/40 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Buscar en Nexión..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-navy/30"
              onFocus={() => setSearchFocus(true)}
              onBlur={() => setSearchFocus(false)}
            />
          </div>
        </div>

        {/* Right Section - Notifications & User */}
        <div className="flex items-center gap-6">
          {/* Notifications */}
          <button className="relative p-2 text-navy/60 hover:text-navy transition-colors group">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full" />
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-border/20" />

          {/* User Profile */}
          {!loading && user ? (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-navy">
                  {user.user_metadata?.full_name || "Usuario"}
                </p>
                <p className="text-xs text-navy/60">
                  {user.user_metadata?.role || "Admin"}
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                {user.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt={user.email}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <svg
                    className="w-6 h-6 text-primary"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                )}
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-light animate-pulse" />
          )}
        </div>
      </div>
    </header>
  );
}
