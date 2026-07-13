import { createBrowserRouter, type RouteObject } from "react-router";
import HomePage from "./pages";
import Chess from "./pages/play/computer";
import OnlineLobby from "./pages/play/online";
import OnlineMatch from "./pages/play/online/[id]";

const routes: RouteObject[] = [
    {
        path: "/",
        element: <HomePage />
    },
    {
        path: "/play/computer",
        element: <Chess />,
    },
    {
        path: "/play/online",
        element: <OnlineLobby />,
    },
    {
        path: "/play/online/:id",
        element: <OnlineMatch />,
    }
]

export const router = createBrowserRouter(routes)