"use client";

import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, useClerk } from "@clerk/nextjs";

interface Props {
  onSettings: () => void;
}

export function UserButton({ onSettings }: Props) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (!user) return null;

  const initials = user.firstName
    ? `${user.firstName[0]}${user.lastName?.[0] ?? ""}`.toUpperCase()
    : (user.emailAddresses[0]?.emailAddress?.[0] ?? "?").toUpperCase();

  const displayName = user.fullName || user.emailAddresses[0]?.emailAddress || "You";

  return (
    <div ref={ref} className="relative mx-3 mb-5">
      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute bottom-full mb-2 left-0 right-0 rounded-xl overflow-hidden"
            style={{
              background: "#1c1c1c",
              border: "0.5px solid rgba(84,84,88,0.4)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
            }}
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
          >
            <button
              onClick={() => { setOpen(false); onSettings(); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(235,235,245,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <span className="text-sm text-[#ccc]">Settings</span>
            </button>

            <div className="h-px mx-3" style={{ background: "rgba(84,84,88,0.3)" }} />

            <button
              onClick={() => signOut({ redirectUrl: "/" })}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(235,235,245,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1" />
              </svg>
              <span className="text-sm text-[#888]">Sign out</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl"
        style={{ background: open ? "rgba(255,255,255,0.06)" : "transparent" }}
      >
        {/* Avatar */}
        {user.imageUrl ? (
          <img
            src={user.imageUrl}
            alt={displayName}
            className="w-7 h-7 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div
            className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold"
            style={{ background: "#b6ff4a", color: "#0a0a0a" }}
          >
            {initials}
          </div>
        )}

        {/* Name */}
        <div className="flex-1 min-w-0 text-left">
          <p className="text-xs font-medium text-[#ccc] truncate leading-tight">{displayName}</p>
          <p className="text-[10px] text-[#444] leading-tight">Beta</p>
        </div>

        {/* Chevron */}
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className="flex-shrink-0 transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "none", color: "#444" }}
        >
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </motion.button>
    </div>
  );
}
