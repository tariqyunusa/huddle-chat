import { useEffect, useRef, useState, memo } from "react";
import mermaid from "mermaid";

mermaid.initialize({ startOnLoad: false, theme: "neutral" });

 function MermaidDiagram({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const idRef = useRef(`mermaid-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    let cancelled = false;
    mermaid
      .render(idRef.current, code)
      .then(({ svg }) => {
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (error) {
    return (
      <pre className="bg-stone-50 border border-stone-200 rounded-lg p-3 text-xs text-rose-500 overflow-x-auto">
        Failed to render diagram: {error}
      </pre>
    );
  }

  return <div ref={ref} className="my-2 flex justify-center" />;
}

export default memo(MermaidDiagram);