"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { AliveCard } from "@/components/AliveCard";
import { SheetHeader } from "@/components/ui/SheetHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatDate } from "@/lib/utils";

type Trip = Doc<"grocery_trips">;

function money(value: number): string {
  return `$${value.toFixed(2)}`;
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div
      className="flex-1 min-w-0 rounded-xl px-3 py-2.5"
      style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <p className="text-[9px] uppercase tracking-wider text-[#6a6a6a] truncate">{label}</p>
      <p
        className="text-lg font-bold tabular-nums mt-0.5"
        style={{ color: accent ?? "#f2f2f2", letterSpacing: "-0.02em" }}
      >
        {value}
      </p>
    </div>
  );
}

/** Expandable detail for one trip — shows the snapshot of what was bought. */
function TripDetailSheet({
  trip,
  accent,
  onClose,
  onDelete,
}: {
  trip: Trip;
  accent: string;
  onClose: () => void;
  onDelete: () => void;
}) {
  const items = useQuery(api.grocery.getTripItems, { tripId: trip._id }) ?? [];

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-black/60"
      />
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 38 }}
        className="fixed inset-x-0 bottom-0 z-50 px-5 pt-4 rounded-t-3xl max-h-[80vh] flex flex-col"
        style={{
          background: "#1a1a1a",
          paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <SheetHeader onClose={onClose} />

        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="min-w-0">
            <p className="text-base font-semibold text-[#f2f2f2]" style={{ letterSpacing: "-0.01em" }}>
              {trip.listName}
            </p>
            <p className="text-xs text-[#6a6a6a]">
              {formatDate(trip.shoppedAt)}
              {trip.store && ` · ${trip.store}`}
            </p>
          </div>
          {trip.actualCost != null && (
            <p className="text-xl font-bold tabular-nums shrink-0" style={{ color: accent }}>
              {money(trip.actualCost)}
            </p>
          )}
        </div>

        {trip.estimatedCost != null && trip.actualCost != null && (
          <p className="text-[11px] text-[#6a6a6a] tabular-nums mb-3">
            {money(trip.estimatedCost)} estimated ·{" "}
            {trip.actualCost >= trip.estimatedCost ? "+" : "−"}
            {money(Math.abs(trip.actualCost - trip.estimatedCost))} difference
          </p>
        )}

        <p className="text-[10px] uppercase tracking-wider text-[#6a6a6a] mb-2 mt-2">
          {trip.itemCount} item{trip.itemCount !== 1 ? "s" : ""}
        </p>

        <div className="flex-1 overflow-y-auto space-y-1.5 pb-3">
          {items.map((item) => (
            <div
              key={item._id}
              className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5"
              style={{ background: "#252525" }}
            >
              <span className="text-sm text-[#f2f2f2] truncate">{item.name}</span>
              {(item.quantity || item.unit) && (
                <span className="text-[11px] text-[#6a6a6a] shrink-0 tabular-nums">
                  {[item.quantity, item.unit].filter(Boolean).join(" ")}
                </span>
              )}
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-center text-[#6a6a6a] text-sm py-6">
              No items were recorded for this trip
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onDelete}
          className="w-full py-3 rounded-xl text-sm font-medium text-[#6a6a6a] shrink-0"
          style={{ background: "#252525" }}
        >
          Delete this trip
        </button>
      </motion.div>
    </>
  );
}

export function TripsView({ userId, accent }: { userId: string; accent: string }) {
  const [openTrip, setOpenTrip] = useState<Trip | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: Id<"grocery_trips">; name: string } | null>(
    null
  );

  const trips = useQuery(api.grocery.getTrips, { userId }) ?? [];
  const stats = useQuery(api.grocery.getTripStats, { userId });
  const deleteTrip = useMutation(api.grocery.deleteTrip);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Headline stats */}
      {stats && stats.tripCount > 0 && (
        <div className="px-4 pb-3 space-y-2">
          <div className="flex gap-2">
            <Stat label="Trips (30d)" value={String(stats.tripsLast30Days)} accent={accent} />
            <Stat label="Spent (30d)" value={money(stats.spendLast30Days)} accent={accent} />
          </div>
          <div className="flex gap-2">
            <Stat
              label="Avg per trip"
              value={stats.averageCost != null ? money(stats.averageCost) : "—"}
            />
            <Stat
              label="Every"
              value={stats.averageDaysBetween != null ? `${stats.averageDaysBetween} days` : "—"}
            />
          </div>
        </div>
      )}

      <div className="flex-1 px-4 space-y-2 pb-32 md:pb-4">
        <AnimatePresence>
          {trips.map((trip) => (
            <AliveCard
              key={trip._id}
              seed={`trip:${trip._id}`}
              accent={accent}
              className="rounded-2xl overflow-hidden px-4 py-3.5"
              onClick={() => setOpenTrip(trip)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setOpenTrip(trip);
                }
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p
                    className="font-bold text-base text-[#f2f2f2] leading-tight truncate"
                    style={{ letterSpacing: "-0.01em" }}
                  >
                    {trip.store || trip.listName}
                  </p>
                  <p className="text-[10px] text-[#6a6a6a] uppercase tracking-wider mt-0.5">
                    {formatDate(trip.shoppedAt)} · {trip.itemCount} item
                    {trip.itemCount !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {trip.actualCost != null ? (
                    <p className="text-base font-bold tabular-nums" style={{ color: accent }}>
                      {money(trip.actualCost)}
                    </p>
                  ) : (
                    <p className="text-xs text-[#4a4a4a]">No total</p>
                  )}
                  {trip.estimatedCost != null && trip.actualCost != null && (
                    <p
                      className="text-[10px] tabular-nums"
                      style={{
                        color: trip.actualCost > trip.estimatedCost ? "#ff8a5c" : "#34c759",
                      }}
                    >
                      {trip.actualCost > trip.estimatedCost ? "+" : "−"}
                      {money(Math.abs(trip.actualCost - trip.estimatedCost))}
                    </p>
                  )}
                </div>
              </div>
            </AliveCard>
          ))}
        </AnimatePresence>

        {trips.length === 0 && (
          <p className="text-center text-[#6a6a6a] text-sm pt-8">
            No trips saved yet — finish a shopping run and save it to start building history
          </p>
        )}
      </div>

      <AnimatePresence>
        {openTrip && (
          <TripDetailSheet
            trip={openTrip}
            accent={accent}
            onClose={() => setOpenTrip(null)}
            onDelete={() => {
              setConfirmDelete({ id: openTrip._id, name: openTrip.store || openTrip.listName });
              setOpenTrip(null);
            }}
          />
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={!!confirmDelete}
        itemName={confirmDelete?.name ?? ""}
        subtitle="This trip record will be deleted permanently."
        onConfirm={async () => {
          if (confirmDelete) await deleteTrip({ id: confirmDelete.id });
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
