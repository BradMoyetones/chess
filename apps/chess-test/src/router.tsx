import { createBrowserRouter, type RouteObject } from "react-router";
import Chess from "./pages/Chess";
import OnlineLobby from "./pages/online/index";
import OnlineMatch from "./pages/online/[id]/index";

const routes: RouteObject[] = [
    {
        path: "/",
        element: <Chess />,
    },
    {
        path: "/online",
        element: <OnlineLobby />,
    },
    {
        path: "/online/:id",
        element: <OnlineMatch />,
    }
]

export const router = createBrowserRouter(routes)