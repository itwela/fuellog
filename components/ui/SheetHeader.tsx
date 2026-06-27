"use client";

export function SheetHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-center mb-5">
      <div className="flex-1" />
      <div className="w-10 h-1 bg-[#3a3a3a] rounded-full" />
      <div className="flex-1 flex justify-end">
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full"
          style={{ background: "rgba(255,255,255,0.07)", color: "#888" }}
        >
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
