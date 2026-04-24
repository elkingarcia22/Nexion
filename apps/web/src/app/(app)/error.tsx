"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-bg">
      <div className="text-center max-w-md">
        <h2 className="text-2xl font-bold text-navy mb-2">Algo salió mal</h2>
        <p className="text-navy/60 mb-6">{error.message || "Error desconocido"}</p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-all"
        >
          Intentar de nuevo
        </button>
      </div>
    </div>
  );
}
