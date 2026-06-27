"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const ACCENT = "#4abaff";

type FoodItem = {
  _id: Id<"food_bank">;
  name: string;
  calories?: number | null;
  protein?: number | null;
  fat?: number | null;
  carbs?: number | null;
  fiber?: number | null;
  sugar?: number | null;
  useCount: number;
  imageUrl: string | null;
};

type EditForm = {
  name: string;
  calories: string;
  protein: string;
  fat: string;
  carbs: string;
  fiber: string;
  sugar: string;
};

function svgPlaceholder(name: string): string {
  const letter = name.charAt(0).toUpperCase();
  const hue = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><rect width="300" height="300" fill="hsl(${hue},30%,16%)"/><text x="150" y="185" font-family="system-ui,sans-serif" font-size="120" font-weight="bold" fill="hsl(${hue},55%,60%)" text-anchor="middle">${letter}</text></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

function toForm(item: FoodItem): EditForm {
  const n = (v: number | null | undefined) => (v != null ? String(v) : "");
  return { name: item.name, calories: n(item.calories), protein: n(item.protein), fat: n(item.fat), carbs: n(item.carbs), fiber: n(item.fiber), sugar: n(item.sugar) };
}

// ─── Masonry Card ─────────────────────────────────────────────────────────────

function MasonryCard({ item, onSelect }: { item: FoodItem; onSelect: () => void }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "0px 0px -40px 0px" });

  return (
    <motion.figure
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      transition={{ duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileTap={{ scale: 0.97 }}
      onClick={onSelect}
      className="inline-block w-full mb-3 rounded-2xl overflow-hidden relative cursor-pointer group"
      style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <motion.img
        layoutId={`fb-img-${item._id}`}
        src={item.imageUrl ?? svgPlaceholder(item.name)}
        alt={item.name}
        className="w-full object-cover"
        draggable={false}
      />

      {/* Hover overlay */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 55%)" }}
      />

      {/* Info — always visible at bottom */}
      <div className="absolute bottom-0 inset-x-0 px-3 py-2.5" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 100%)" }}>
        <p className="text-[12px] font-semibold text-white leading-tight line-clamp-1" style={{ letterSpacing: "-0.01em" }}>
          {item.name}
        </p>
        {item.calories != null && (
          <p className="text-[10px] font-medium mt-0.5" style={{ color: ACCENT }}>
            {item.calories} kcal
          </p>
        )}
      </div>

      {item.useCount > 0 && (
        <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full text-[8px] font-bold" style={{ background: "rgba(0,0,0,0.6)", color: "rgba(235,235,245,0.45)" }}>
          {item.useCount}×
        </div>
      )}
    </motion.figure>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

const MACRO_FIELDS: [keyof EditForm, string, string][] = [
  ["calories", "Calories", "kcal"],
  ["protein", "Protein", "g"],
  ["carbs", "Carbs", "g"],
  ["fat", "Fat", "g"],
  ["fiber", "Fiber", "g"],
  ["sugar", "Sugar", "g"],
];

function EditModal({ item, onClose, onDelete, onSave, onUploadPhoto, uploadingPhoto }: {
  item: FoodItem;
  onClose: () => void;
  onDelete: () => void;
  onSave: (form: EditForm) => Promise<void>;
  onUploadPhoto: () => void;
  uploadingPhoto: boolean;
}) {
  const [form, setForm] = useState<EditForm>(() => toForm(item));
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function set(field: keyof EditForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try { await onSave(form); onClose(); } finally { setSaving(false); }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.22 }}
        onClick={onClose}
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
      />
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center pointer-events-none p-4">
        <motion.div
          initial={{ y: 60, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 40, opacity: 0, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 360, damping: 38 }}
          className="w-full max-w-sm rounded-3xl overflow-hidden pointer-events-auto"
          style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.09)", maxHeight: "90dvh", overflowY: "auto", overscrollBehavior: "contain", boxShadow: "0 32px 80px rgba(0,0,0,0.8), 0 1px 0 rgba(255,255,255,0.06) inset" }}
        >
          {/* Hero */}
          <motion.div layoutId={`fb-img-${item._id}`} className="w-full relative overflow-hidden flex-shrink-0" style={{ height: 220 }}>
            <img src={item.imageUrl ?? svgPlaceholder(item.name)} alt={item.name} className="w-full h-full object-cover" draggable={false} />
            <div className="absolute inset-x-0 bottom-0 h-24 pointer-events-none" style={{ background: "linear-gradient(to top, #1a1a1a, transparent)" }} />
            <div className="absolute inset-0 flex items-start justify-between p-3">
              <button onClick={onUploadPhoto} disabled={uploadingPhoto} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", color: "#f2f2f2" }}>
                {uploadingPhoto
                  ? <svg className="animate-spin w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" d="M12 3a9 9 0 1 1 0 18A9 9 0 0 1 12 3Z" /></svg>
                  : <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" /></svg>
                }
                {item.imageUrl ? "Change photo" : "Add photo"}
              </button>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", color: "#f2f2f2" }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </motion.div>

          {/* Form */}
          <div className="px-5 pt-3 pb-7">
            <div className="mb-4">
              <label className="text-xs font-medium text-[#6a6a6a] block mb-1.5">Name</label>
              <input value={form.name} onChange={(e) => set("name", e.target.value)} className="w-full rounded-xl px-4 py-3 text-[15px] font-medium text-[#f2f2f2] outline-none" style={{ background: "#252525", border: "1px solid rgba(255,255,255,0.05)", letterSpacing: "-0.01em" }} />
            </div>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {MACRO_FIELDS.map(([field, label, unit]) => (
                <div key={field} className="rounded-xl" style={{ background: "#252525", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <div className="flex items-center px-3.5 py-3">
                    <label className="flex-1 text-xs font-medium text-[#6a6a6a]">{label}<span className="opacity-50 ml-1 text-[10px]">{unit}</span></label>
                    <input type="number" value={form[field]} onChange={(e) => set(field, e.target.value)} placeholder="—" className="w-16 text-right bg-transparent text-sm font-medium text-[#f2f2f2] placeholder-[#3a3a3a] outline-none tabular-nums" style={{ letterSpacing: "-0.01em" }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => setConfirmDelete(true)} className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,69,58,0.12)", color: "#ff453a", border: "1px solid rgba(255,69,58,0.22)" }}>
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
              </motion.button>
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave} disabled={saving || !form.name.trim()} className="flex-1 py-3 rounded-xl text-[15px] font-semibold" style={{ background: ACCENT, color: "#0e0e0e", opacity: form.name.trim() && !saving ? 1 : 0.35, letterSpacing: "-0.01em" }}>
                {saving ? "Saving…" : "Save"}
              </motion.button>
            </div>
            <ConfirmDialog
              open={confirmDelete}
              itemName={item.name}
              subtitle="This food will be removed from your bank permanently."
              onConfirm={onDelete}
              onCancel={() => setConfirmDelete(false)}
            />
          </div>
        </motion.div>
      </div>
    </>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export function FoodBankView({ userId }: { userId: string }) {
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<FoodItem | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadingForRef = useRef<Id<"food_bank"> | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const q = search.trim();

  const { results: pagedItems, status, loadMore } = usePaginatedQuery(
    api.foodbank.listPaginated,
    { userId },
    { initialNumItems: 30 }
  );
  const searchResults = (useQuery(api.foodbank.search, q ? { userId, query: q } : "skip") ?? []) as FoodItem[];

  const items: FoodItem[] = q ? searchResults : (pagedItems as FoodItem[]);
  const canLoadMore = !q && status === "CanLoadMore";

  const remove = useMutation(api.foodbank.remove);
  const update = useMutation(api.foodbank.update);
  const setImage = useMutation(api.foodbank.setImage);
  const generateUploadUrl = useMutation(api.fileStorage.generateUploadUrl);

  // Intersection observer — load more when sentinel scrolls into view
  useEffect(() => {
    if (!sentinelRef.current || !canLoadMore) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(30); },
      { rootMargin: "200px" }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [canLoadMore, loadMore]);

  async function handleSave(form: EditForm) {
    if (!selectedItem) return;
    await update({
      id: selectedItem._id,
      name: form.name.trim(),
      calories: form.calories ? Number(form.calories) : undefined,
      protein: form.protein ? Number(form.protein) : undefined,
      fat: form.fat ? Number(form.fat) : undefined,
      carbs: form.carbs ? Number(form.carbs) : undefined,
      fiber: form.fiber ? Number(form.fiber) : undefined,
      sugar: form.sugar ? Number(form.sugar) : undefined,
    });
  }

  async function handleDelete() {
    if (!selectedItem) return;
    await remove({ id: selectedItem._id });
    setSelectedItem(null);
  }

  function handleUploadPhoto() {
    if (!selectedItem) return;
    uploadingForRef.current = selectedItem._id;
    fileRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const itemId = uploadingForRef.current;
    if (!file || !itemId) return;
    e.target.value = "";
    setUploadingPhoto(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": file.type }, body: file });
      const { storageId } = await result.json();
      await setImage({ id: itemId, imageStorageId: storageId });
    } finally {
      setUploadingPhoto(false);
      uploadingForRef.current = null;
    }
  }

  return (
    <div className="flex flex-col min-h-full pb-24">
      {/* Header */}
      <div className="px-5 pt-12 pb-4">
        <p className="text-xs font-medium text-[#6a6a6a]">Saved foods</p>
        <h1 className="text-[52px] leading-none font-bold" style={{ color: ACCENT, letterSpacing: "-0.03em" }}>
          Food Bank
        </h1>
      </div>

      {/* Search */}
      <div className="px-5 mb-5">
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" width="14" height="14" fill="none" stroke="rgba(235,235,245,0.3)" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your food bank…"
            className="w-full rounded-xl pl-9 pr-9 py-3 text-sm font-medium text-[#f2f2f2] placeholder-[#3a3a3a] outline-none"
            style={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.05)", letterSpacing: "-0.01em" }}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#3a3a3a", color: "#8a8a8a" }}>
              <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
            </button>
          )}
        </div>
      </div>

      {/* Masonry grid */}
      <div className="px-4">
        {items.length === 0 && status !== "LoadingFirstPage" ? (
          <p className="text-center text-[#6a6a6a] text-sm pt-16">
            {q ? `No results for "${search}"` : "Log meals to build your food bank"}
          </p>
        ) : (
          <div className="columns-2 md:columns-3 gap-3">
            {items.map((item) => (
              <MasonryCard key={item._id} item={item} onSelect={() => setSelectedItem(item)} />
            ))}
          </div>
        )}

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="h-1" />

        {/* Loading more indicator */}
        {status === "LoadingMore" && (
          <div className="flex justify-center py-6">
            <div className="flex gap-[5px]">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="block w-[5px] h-[5px] rounded-full"
                  style={{ background: ACCENT }}
                  animate={{ opacity: [0.25, 1, 0.25] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      <AnimatePresence>
        {selectedItem && (
          <EditModal
            key={selectedItem._id}
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onDelete={handleDelete}
            onSave={handleSave}
            onUploadPhoto={handleUploadPhoto}
            uploadingPhoto={uploadingPhoto}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
