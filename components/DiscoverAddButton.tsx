"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  addCatalogEntryAction,
  addUsProgramAction,
  type DiscoverAddResult,
  type UsProgramPayload,
} from "@/app/app/discover/actions";

type Props =
  | { kind: "catalog"; entryId: string; mode: "application" | "watchlist"; added?: boolean; addedHref?: string }
  | { kind: "us-program"; payload: UsProgramPayload; added?: boolean; addedHref?: string };

export function DiscoverAddButton(props: Props) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<DiscoverAddResult | null>(null);

  const isWatchlist = props.kind === "catalog" && props.mode === "watchlist";
  const done = props.added || result?.success;
  const href = result?.applicationId ? `/app/applications/${result.applicationId}` : props.addedHref;

  function handleClick() {
    startTransition(async () => {
      const res =
        props.kind === "catalog"
          ? await addCatalogEntryAction(props.entryId, props.mode)
          : await addUsProgramAction(props.payload);
      setResult(res);
    });
  }

  if (done) {
    const label = isWatchlist ? "On watchlist" : "Added";
    return (
      <span className="inline-flex items-center gap-2 text-xs font-bold text-teal-dark shrink-0 whitespace-nowrap">
        <span aria-hidden="true">✓</span>
        <span>{result?.alreadyAdded ? `Already ${label.toLowerCase()}` : label}</span>
        {href && !isWatchlist && (
          <Link href={href} className="text-brand hover:text-brand-dark underline underline-offset-2">
            Open
          </Link>
        )}
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col items-start gap-1 shrink-0">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={
          isWatchlist
            ? "h-9 px-3.5 whitespace-nowrap text-xs font-bold text-brand-dark bg-white/80 border border-brand/30 hover:bg-brand-soft rounded-xl transition-colors disabled:opacity-60 cursor-pointer"
            : "h-9 px-4 whitespace-nowrap text-xs font-bold text-white bg-gradient-to-r from-brand to-brand-dark hover:from-brand-hover hover:to-brand rounded-xl shadow-sm transition-all disabled:opacity-60 cursor-pointer"
        }
      >
        {isPending ? "Adding…" : isWatchlist ? "Watch for opening" : "+ Add to my applications"}
      </button>
      {result?.error && (
        <span role="alert" className="text-[11px] text-red-600 font-medium max-w-xs">
          {result.error}
        </span>
      )}
    </span>
  );
}
