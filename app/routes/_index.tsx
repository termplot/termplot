import type { Route } from "./+types/_index";
import { $aicon } from "~/util/aicons";

export function meta({ data }: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export function loader({ context }: Route.LoaderArgs) {
  return { message: context.VALUE_FROM_EXPRESS };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return (
    <div className="grid place-items-center min-h-[400px]">
      <div>
        <img
          src={$aicon("/images/termplot-2-300.webp")}
          alt="Termplot Icon"
          className="w-[150px] aspect-square mx-auto block"
        />
        <h1 className="mx-auto block text-center text-xl font-bold my-2">
          Termplot
        </h1>
        <p className="text-center text-gray-700 dark:text-gray-300">
          Beautiful plots in your terminal.
        </p>
      </div>
    </div>
  );
}
