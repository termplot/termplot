import type { Route } from "./+types/plotly.$id";

export function meta({ data }: Route.MetaArgs) {
  return [
    { title: "Plotly Plot" },
    { name: "description", content: "Welcome to Termplot!" },
  ];
}

export function loader({ context }: Route.LoaderArgs) {
  return { message: context.VALUE_FROM_EXPRESS };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return <div>hello world</div>;
}
