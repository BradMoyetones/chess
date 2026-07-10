import { createBrowserRouter, type RouteObject } from "react-router";
import Chess from "./pages/Chess";
import OnlinePlay from "./pages/OnlinePlay";

const routes: RouteObject[] = [
    {
        path: "/",
        element: <Chess />,
    },
    {
        path: "/online/:id?",
        element: <OnlinePlay />,
    }
]

export const router = createBrowserRouter(routes)