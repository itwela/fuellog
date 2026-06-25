"use client";

import { motion, AnimatePresence } from "framer-motion";

interface ConfirmDialogProps {
  open: boolean;
  itemName: string;
  subtitle?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  itemName,
  subtitle,
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[300] flex items-center justify-center px-6"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.78, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.88, opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 520, damping: 36 }}
            className="w-full max-w-[310px] rounded-3xl overflow-hidden"
            style={{
              background: "#1c1c1e",
              border: "1px solid rgba(255,69,58,0.2)",
              boxShadow:
                "0 0 0 1px rgba(255,255,255,0.04) inset, 0 0 50px rgba(255,69,58,0.14), 0 24px 72px rgba(0,0,0,0.7)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon + text */}
            <div className="flex flex-col items-center pt-9 pb-5 px-6 text-center">
              {/* Trash icon with pulsing glow */}
              <div className="relative mb-5">
                <motion.div
                  className="absolute -inset-3 rounded-full"
                  style={{ background: "radial-gradient(circle, rgba(255,69,58,0.25) 0%, transparent 70%)" }}
                  animate={{ scale: [1, 1.2, 1], opacity: [0.7, 0.35, 0.7] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                />
                <div
                  className="relative w-[60px] h-[60px] rounded-full flex items-center justify-center"
                  style={{
                    background: "rgba(255,69,58,0.13)",
                    border: "1.5px solid rgba(255,69,58,0.38)",
                  }}
                >
                  <svg width="26" height="26" fill="none" stroke="#ff453a" strokeWidth="1.6" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                    />
                  </svg>
                </div>
              </div>

              <p
                className="text-[17px] font-bold text-[#f2f2f2] leading-tight"
                style={{ letterSpacing: "-0.02em" }}
              >
                Delete &ldquo;{itemName}&rdquo;?
              </p>
              <p className="text-[13px] text-[#6a6a6a] mt-2 leading-relaxed">
                {subtitle ?? "This can't be undone."}
              </p>
            </div>

            {/* Divider */}
            <div style={{ height: "1px", background: "rgba(255,255,255,0.07)" }} />

            {/* Buttons — iOS action-sheet style */}
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => void onConfirm()}
              disabled={loading}
              className="w-full py-[17px] text-[15px] font-bold transition-opacity"
              style={{ color: "#ff453a", opacity: loading ? 0.5 : 1 }}
            >
              {loading ? "Deleting…" : "Delete"}
            </motion.button>

            <div style={{ height: "1px", background: "rgba(255,255,255,0.07)" }} />

            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={onCancel}
              className="w-full py-[17px] text-[15px] font-medium text-[#8e8e93]"
            >
              Cancel
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
