"use client";

import { useState } from "react";

type Props = {
  value: string;
  className?: string;
};

export default function CopyButton({ value, className = "" }: Props) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      className={`rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-100 ${className}`}
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
