"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { NavItem as NavItemType } from "@/constants/nav";

interface NavItemProps {
  item: NavItemType;
}

export function NavItem({ item }: NavItemProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(
    item.children?.some((child) => pathname.startsWith(child.href)) ?? false
  );

  const isActive = pathname === item.href || pathname.startsWith(item.href);
  const hasChildren = item.children && item.children.length > 0;

  return (
    <div>
      <div
        className={`flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
          isActive
            ? "border-l-4 border-primary text-white"
            : "text-light/60 hover:bg-white hover:bg-opacity-5"
        }`}
        style={isActive ? { backgroundColor: 'rgba(26, 107, 255, 0.15)' } : {}}
      >
        <Link href={item.href} className="flex-1">
          <span className="text-sm font-medium">{item.label}</span>
        </Link>
        {hasChildren && (
          <button
            onClick={(e) => {
              e.preventDefault();
              setIsOpen(!isOpen);
            }}
            className="text-light hover:text-white transition-colors"
          >
            <svg
              className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 14l-7 7m0 0l-7-7m7 7V3"
              />
            </svg>
          </button>
        )}
      </div>

      {hasChildren && isOpen && (
        <div className="ml-4 mt-2 space-y-2 border-l border-white border-opacity-10 pl-4">
          {item.children!.map((child) => {
            const childIsActive = pathname === child.href;
            return (
              <Link
                key={child.href}
                href={child.href}
                className={`block px-3 py-2 rounded text-sm transition-all ${
                  childIsActive
                    ? "text-white font-medium"
                    : "text-light/60 hover:bg-white hover:bg-opacity-5"
                }`}
                style={childIsActive ? { backgroundColor: 'rgba(26, 107, 255, 0.15)' } : {}}
              >
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
