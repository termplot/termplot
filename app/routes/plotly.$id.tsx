import type { Route } from "./+types/plotly.$id";
import { plotlyDb } from "~/.server/plotly-db";

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
  return (
    <div>
      <div>hello world</div>
      <div>
        {plotlyConfig ? JSON.stringify(plotlyConfig) : "No plot data available"}
      </div>
    </div>
  );
}
