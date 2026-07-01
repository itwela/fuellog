"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!heroRef.current) return;
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      const x = (clientX / innerWidth - 0.5) * 30;
      const y = (clientY / innerHeight - 0.5) * 30;
      heroRef.current.style.setProperty("--glow-x", `${50 + x}%`);
      heroRef.current.style.setProperty("--glow-y", `${50 + y}%`);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f2f2f2] overflow-x-hidden">

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-5 md:px-12">
        <span className="text-sm font-bold tracking-[0.25em] uppercase text-[#b6ff4a]">
          MACROE
        </span>
        <Link
          href="/sign-in"
          className="text-sm text-[#888] hover:text-[#f2f2f2] transition-colors"
        >
          Sign in
        </Link>
      </nav>

      {/* Hero */}
      <div
        ref={heroRef}
        className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center"
        style={{
          background: `radial-gradient(ellipse 60% 50% at var(--glow-x, 50%) var(--glow-y, 50%), rgba(182,255,74,0.07) 0%, transparent 70%), #0a0a0a`,
        }}
      >
        {/* Grain overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            backgroundSize: "200px",
          }}
        />

        <div className="relative z-10 max-w-5xl mx-auto">
          {/* Label */}
          <div className="inline-flex items-center gap-2 mb-8 px-3 py-1.5 rounded-full border border-white/10 text-xs text-[#888] tracking-widest uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-[#b6ff4a] animate-pulse" />
            Beta — 5 spots open
          </div>

          {/* Main headline */}
          <h1 className="text-[clamp(3.5rem,12vw,10rem)] font-black leading-[0.88] tracking-tight uppercase mb-6">
            Know what
            <br />
            <span className="text-[#b6ff4a]">you&apos;re eating.</span>
          </h1>

          <p className="text-[#888] text-lg md:text-xl max-w-xl mx-auto mb-10 leading-relaxed font-light">
            macroe tracks your food, your macros, and your groceries — with AI
            that actually understands how you eat.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/sign-up"
              className="px-8 py-4 bg-[#b6ff4a] text-black font-bold text-sm tracking-widest uppercase rounded-sm hover:bg-[#c8ff6a] transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Join the beta
            </Link>
            <Link
              href="/sign-in"
              className="px-8 py-4 border border-white/15 text-[#888] font-medium text-sm tracking-widest uppercase rounded-sm hover:border-white/30 hover:text-[#f2f2f2] transition-all"
            >
              Already in →
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30">
          <span className="text-xs tracking-widest uppercase">scroll</span>
          <div className="w-px h-8 bg-white/30" />
        </div>
      </div>

      {/* Features */}
      <div className="px-6 md:px-12 py-24 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-3 gap-px bg-white/5 border border-white/5">
          {[
            {
              number: "01",
              title: "Log in seconds",
              body: "Snap a photo, paste a URL, or just describe what you ate. The AI figures out the rest — calories, macros, everything.",
            },
            {
              number: "02",
              title: "Hit your numbers",
              body: "Set your protein, calories, and fat goals. Watch them fill in throughout the day. No spreadsheet. No mental math.",
            },
            {
              number: "03",
              title: "Groceries write themselves",
              body: "Add meals to your plan and macroe builds your grocery list. Show up to the store knowing exactly what you need.",
            },
          ].map((f) => (
            <div key={f.number} className="bg-[#0a0a0a] p-8 md:p-10">
              <p className="text-[#b6ff4a] text-xs font-bold tracking-[0.3em] uppercase mb-4">
                {f.number}
              </p>
              <h3 className="text-xl font-bold mb-3">{f.title}</h3>
              <p className="text-[#666] text-sm leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Beta CTA */}
      <div className="px-6 md:px-12 py-24 border-t border-white/5">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-xs text-[#b6ff4a] tracking-[0.3em] uppercase mb-4">
            Limited access
          </p>
          <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tight mb-6">
            5 people.
            <br />
            Free access.
            <br />
            <span className="text-[#444]">Real commitment.</span>
          </h2>
          <p className="text-[#666] mb-10 max-w-md mx-auto leading-relaxed">
            I&apos;m running this with a small group — you track your food, I track
            what to build next. No payment, no BS. Just show up.
          </p>
          <Link
            href="/sign-up"
            className="inline-flex px-10 py-4 bg-[#b6ff4a] text-black font-bold text-sm tracking-widest uppercase rounded-sm hover:bg-[#c8ff6a] transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Claim your spot
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="px-6 md:px-12 py-8 border-t border-white/5 flex items-center justify-between">
        <span className="text-xs font-bold tracking-[0.25em] uppercase text-[#333]">
          MACROE
        </span>
        <span className="text-xs text-[#333]">
          by{" "}
          <a
            href="https://cavemancreativehq.com"
            target="_blank"
            rel="noreferrer"
            className="hover:text-[#666] transition-colors"
          >
            Caveman Creative
          </a>
        </span>
      </footer>
    </div>
  );
}
