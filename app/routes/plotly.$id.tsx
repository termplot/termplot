import { useEffect, useRef } from "react";
import { Plotly } from "~/.client/plotly"; // or 'plotly.js-dist-min' if preferred
import { plotlyDb } from "~/.server/plotly-db";
import type { Route } from "./+types/plotly.$id";

export function loader({ context, params }: Route.LoaderArgs) {
  const plotlyConfig = plotlyDb.getPlot(params.id);
  return { message: context.VALUE_FROM_EXPRESS, plotlyConfig };
}

export function meta({ data }: Route.MetaArgs) {
  const title = data?.plotlyConfig?.layout?.title?.text || "Plotly Plot";
  return [
    { title: `Plotly Plot - ${title}` },
    { name: "description", content: "Welcome to Termplot!" },
  ];
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { plotlyConfig } = loaderData;
  const plotRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: only loading once at startup
  useEffect(() => {
    // Ensure the ref is attached to a DOM element and plotlyConfig is available
    if (plotRef.current && plotlyConfig) {
      // Initialize or update the Plotly chart
      Plotly.newPlot(
        plotRef.current,
        plotlyConfig.data,
        plotlyConfig.layout,
        plotlyConfig.config,
      );
    }

    // Cleanup on component unmount to prevent memory leaks
    return () => {
      if (plotRef.current) {
        Plotly.purge(plotRef.current);
      }
    };
  }, []); // Re-render the plot when plotlyConfig changes

  return (
    <div className="bg-[#1A1A1A] h-full">
      <div>
        {plotlyConfig ? (
          <div
            ref={plotRef}
            style={{ width: "100%", height: plotlyConfig.layout.height || 600 }}
          />
        ) : (
          "No plot data available"
        )}
      </div>
    </div>
  );
}
