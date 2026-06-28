import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Dashboard from "./pages/Dashboardd.jsx";
import Auth from "./pages/Auth.jsx";
import Intake from "./pages/Intakee.jsx";
import Landingg from "./pages/Landingg.jsx";
import Profile from "./pages/Profile.jsx";
import Layout from "./layouts/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx"; // Import route guard

function App() {
  const router = createBrowserRouter([
    {
      path: "/",
      element: <Layout />,
      children: [
        // Public pages
        {
          index: true,
          element: <Landingg />,
        },
        {
          path: "/Auth",
          element: <Auth />,
        },
        // Protected Private Routes
        {
          element: <ProtectedRoute />, // All routes under this outlet require authentication
          children: [
            {
              path: "/Dashboardd",
              element: <Dashboard />,
            },
            {
              path: "/Intakee",
              element: <Intake />,
            },
            {
              path: "/Profile",
              element: <Profile />,
            },
          ],
        },
      ],
    },
  ]);

  return <RouterProvider router={router} />;
}

export default App;