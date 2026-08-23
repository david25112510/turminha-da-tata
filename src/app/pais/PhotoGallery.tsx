"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

export type GalleryPhoto = { id: string; url: string; caption: string | null; takenAt: Date };

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(date);
}

/** Grade mobile-first com visualização maior ao tocar (<dialog> nativo, sem lib nova). */
export function PhotoGallery({ photos }: { photos: GalleryPhoto[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [active, setActive] = useState<GalleryPhoto | null>(null);

  useEffect(() => {
    if (active) dialogRef.current?.showModal();
  }, [active]);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {photos.map((photo) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setActive(photo)}
            className="relative aspect-square rounded-2xl overflow-hidden bg-[#F3EEE1] min-h-11"
          >
            <Image src={photo.url} alt={photo.caption ?? ""} fill sizes="200px" className="object-cover" />
          </button>
        ))}
      </div>

      <dialog
        ref={dialogRef}
        className="rounded-2xl p-0 backdrop:bg-black/70 w-[calc(100%-2rem)] max-w-lg m-auto"
        onClose={() => setActive(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) dialogRef.current?.close();
        }}
      >
        {active && (
          <div className="bg-[#FFFDF8] rounded-2xl overflow-hidden">
            <div className="relative aspect-square w-full bg-[#F3EEE1]">
              <Image src={active.url} alt={active.caption ?? ""} fill sizes="500px" className="object-contain" />
            </div>
            <div className="p-4 flex items-center justify-between gap-3">
              <div>
                {active.caption && <p className="text-sm text-[#2E2418] font-medium">{active.caption}</p>}
                <p className="text-xs text-[#9A8A72]">{formatTime(active.takenAt)}</p>
              </div>
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="min-h-11 px-3 text-sm font-semibold text-[#9A8A72]"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
