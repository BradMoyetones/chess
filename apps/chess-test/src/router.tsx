import { createBrowserRouter, type RouteObject } from "react-router";
import Chess from "./pages";
import OnlineLobby from "./pages/online";
import OnlineMatch from "./pages/online/[id]";

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