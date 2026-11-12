import { useEffect, useRef, useState, memo } from "react";
import mermaid from "mermaid";

function diagramTheme(isDark: boolean) {
  return {
    startOnLoad: false,
    theme: "base" as const,
    suppressErrorRendering: true,
    themeVariables: isDark
      ? {
          background: "#0c0a09",
          primaryColor: "#292524",
          primaryTextColor: "#f5f5f4",
          primaryBorderColor: "#78716c",
          secondaryColor: "#1c1917",
          secondaryTextColor: "#e7e5e4",
          secondaryBorderColor: "#57534e",
          tertiaryColor: "#141210",
          tertiaryTextColor: "#e7e5e4",
          tertiaryBorderColor: "#57534e",
          lineColor: "#a8a29e",
          textColor: "#e7e5e4",
          mainBkg: "#292524",
          nodeBorder: "#78716c",
          clusterBkg: "#1c1917",
          clusterBorder: "#57534e",
          edgeLabelBackground: "#0c0a09",
          fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        }
      : {
          background: "#ffffff",
          primaryColor: "#f5f5f4",
          primaryTextColor: "#292524",
          primaryBorderColor: "#a8a29e",
          secondaryColor: "#fafaf9",
          secondaryTextColor: "#44403c",
          secondaryBorderColor: "#d6d3d1",
          tertiaryColor: "#ffffff",
          tertiaryTextColor: "#44403c",
          tertiaryBorderColor: "#d6d3d1",
          lineColor: "#78716c",
          textColor: "#44403c",
          mainBkg: "#f5f5f4",
          nodeBorder: "#a8a29e",
          clusterBkg: "#fafaf9",
          clusterBorder: "#d6d3d1",
          edgeLabelBackground: "#ffffff",
          fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        },
  };
}

function MermaidDiagram({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));
  const idRef = useRef(`mermaid-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => setIsDark(root.classList.contains("dark")));
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    if (ref.current) ref.current.innerHTML = ""; // clear before attempting
    mermaid.initialize(diagramTheme(isDark));
    mermaid
      .render(idRef.current, code)
      .then(({ svg }) => {
        if (!cancelled && ref.current) {
          ref.current.innerHTML = svg;
          ref.current.querySelector("svg")?.style.setProperty("max-width", "none");
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unknown diagram error");
      });
    return () => {
      cancelled = true;
    };
  }, [code, isDark]);

  if (error) {
    return (
      <section role="alert" className="my-3 overflow-hidden rounded-xl border border-stone-200 bg-stone-50 dark:border-stone-700 dark:bg-stone-900">
        <div className="border-b border-stone-200 px-4 py-3 dark:border-stone-700">
          <h3 className="text-sm font-medium text-stone-800 dark:text-stone-100">Diagram unavailable</h3>
          <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">The diagram source is shown below.</p>
        </div>
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words px-4 py-3 font-mono text-xs leading-5 text-stone-600 dark:text-stone-300">{code}</pre>
      </section>
    );
  }

  return (
    <div
      className="my-4 max-w-full overflow-auto rounded-xl border border-stone-200 bg-white shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-2 dark:border-stone-700 dark:bg-stone-900 dark:focus-visible:ring-stone-500 dark:focus-visible:ring-offset-stone-950 [&_svg]:block [&_svg]:h-auto [&_svg]:max-w-none"
      role="region"
      aria-label="Mermaid diagram"
      tabIndex={0}
    >
      <div ref={ref} className="flex w-max min-w-full justify-center px-5 py-4 [&_svg]:block [&_svg]:h-auto [&_svg]:max-w-none" />
    </div>
  );
}

export default memo(MermaidDiagram);
