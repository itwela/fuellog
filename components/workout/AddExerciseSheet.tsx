"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const MUSCLE_GROUPS = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Legs", "Glutes", "Core", "Cardio", "Full Body"];

interface EditExercise {
  _id: Id<"exercises">;
  name: string;
  muscleGroup?: string | null;
  defaultSets?: number | null;
  defaultReps?: string | null;
  defaultWeight?: string | null;
  gifUrl?: string | null;
}

export function AddExerciseSheet({
  userId,
  accent,
  onClose,
  editExercise,
}: {
  userId: string;
  accent: string;
  onClose: () => void;
  editExercise?: EditExercise;
}) {
  const isEdit = !!editExercise;
  const [name, setName] = useState(editExercise?.name ?? "");
  const [muscleGroup, setMuscleGroup] = useState(editExercise?.muscleGroup ?? "");
  const [sets, setSets] = useState(editExercise?.defaultSets?.toString() ?? "3");
  const [reps, setReps] = useState(editExercise?.defaultReps ?? "10");
  const [weight, setWeight] = useState(editExercise?.defaultWeight ?? "");
  const [gifUrl, setGifUrl] = useState(editExercise?.gifUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadedStorageId, setUploadedStorageId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const addExercise = useMutation(api.workout.addExercise);
  const updateExercise = useMutation(api.workout.updateExercise);
  const generateUploadUrl = useMutation(api.fileStorage.generateUploadUrl);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      setUploadedStorageId(storageId);
      setPreviewUrl(URL.createObjectURL(file));
      setGifUrl("");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!name.trim()) return;
    if (isEdit && editExercise) {
      await updateExercise({
        id: editExercise._id,
        name: name.trim(),
        muscleGroup: muscleGroup || undefined,
        defaultSets: sets ? Number(sets) : undefined,
        defaultReps: reps || undefined,
        defaultWeight: weight || undefined,
        gifUrl: gifUrl.trim() || undefined,
        imageStorageId: uploadedStorageId || undefined,
      });
    } else {
      await addExercise({
        userId,
        name: name.trim(),
        muscleGroup: muscleGroup || undefined,
        defaultSets: sets ? Number(sets) : undefined,
        defaultReps: reps || undefined,
        defaultWeight: weight || undefined,
        gifUrl: gifUrl.trim() || undefined,
        imageStorageId: uploadedStorageId || undefined,
      });
    }
    onClose();
  }

  const mediaPreview = previewUrl || (gifUrl.trim() ? gifUrl.trim() : null);

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
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl px-5 pt-4 pb-8"
        style={{ background: "#1a1a1a", maxHeight: "90dvh", overflowY: "auto" }}
      >
        <div className="w-10 h-1 bg-[#3a3a3a] rounded-full mx-auto mb-5" />
        <h2 className="text-xl font-bold mb-5" style={{ fontFamily: "var(--font-display)" }}>
          {isEdit ? "Edit Exercise" : "Add Exercise"}
        </h2>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-[#6a6a6a] block mb-1">Exercise name *</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bench Press"
              className="w-full bg-[#252525] rounded-xl px-4 py-3 text-sm text-[#f2f2f2] placeholder-[#6a6a6a] outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-[#6a6a6a] block mb-2">Muscle group</label>
            <div className="flex flex-wrap gap-2">
              {MUSCLE_GROUPS.map((mg) => (
                <button
                  key={mg}
                  onClick={() => setMuscleGroup(mg === muscleGroup ? "" : mg)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium"
                  style={{
                    background: muscleGroup === mg ? accent : "#252525",
                    color: muscleGroup === mg ? "#0e0e0e" : "#6a6a6a",
                  }}
                >
                  {mg}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {([
              ["Sets", sets, setSets],
              ["Reps", reps, setReps],
              ["Weight", weight, setWeight],
            ] as [string, string, (v: string) => void][]).map(([label, val, setter]) => (
              <div key={label}>
                <label className="text-xs font-medium text-[#6a6a6a] block mb-1">{label}</label>
                <input
                  type={label !== "Weight" ? "number" : "text"}
                  value={val}
                  onChange={(e) => setter(e.target.value)}
                  placeholder={label === "Weight" ? "lbs" : "0"}
                  className="w-full bg-[#252525] rounded-xl px-3 py-3 text-sm text-[#f2f2f2] placeholder-[#6a6a6a] outline-none"
                />
              </div>
            ))}
          </div>

          {/* Media section */}
          <div>
            <label className="text-xs font-medium text-[#6a6a6a] block mb-2">Exercise media</label>

            {/* Upload button */}
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/gif"
              className="hidden"
              onChange={handleFileUpload}
            />
            <div className="flex gap-2 mb-2">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                style={{ background: uploadedStorageId ? `${accent}22` : "#252525", color: accent, border: `1px solid ${accent}44` }}
              >
                {uploading ? (
                  <>
                    <svg className="animate-spin" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" d="M12 3a9 9 0 1 1 0 18A9 9 0 0 1 12 3Z" />
                    </svg>
                    Uploading...
                  </>
                ) : uploadedStorageId ? (
                  <>
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    Uploaded
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                    </svg>
                    Upload GIF / Image
                  </>
                )}
              </motion.button>
              {uploadedStorageId && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { setUploadedStorageId(null); setPreviewUrl(null); }}
                  className="px-3 py-2.5 rounded-xl text-xs text-[#6a6a6a]"
                  style={{ background: "#252525" }}
                >
                  Clear
                </motion.button>
              )}
            </div>

            {/* Or paste URL */}
            {!uploadedStorageId && (
              <input
                value={gifUrl}
                onChange={(e) => setGifUrl(e.target.value)}
                placeholder="Or paste a GIF / image URL..."
                className="w-full bg-[#252525] rounded-xl px-4 py-3 text-sm text-[#f2f2f2] placeholder-[#6a6a6a] outline-none"
              />
            )}

            {/* Preview */}
            {mediaPreview && (
              <img
                src={mediaPreview}
                alt="preview"
                className="w-full rounded-xl mt-2 object-cover"
                style={{ maxHeight: 160 }}
              />
            )}
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={handleSave}
          disabled={!name.trim()}
          className="w-full mt-6 py-4 rounded-2xl font-bold text-base"
          style={{
            background: accent,
            color: "#0e0e0e",
            opacity: name.trim() ? 1 : 0.4,
            fontFamily: "var(--font-display)",
          }}
        >
          {isEdit ? "Save Changes" : "Add Exercise"}
        </motion.button>
      </motion.div>
    </>
  );
}
