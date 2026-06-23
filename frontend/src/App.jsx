import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Dashboard from "./pages/Dashboardd.jsx";
import Auth from "./pages/Auth.jsx";
import Intake from "./pages/Intakee.jsx";
import Landingg from "./pages/Landingg.jsx";
import Profile from "./pages/Profile.jsx";
import Layout from "./layouts/Layout.jsx";

function App() {
  // Hinglish: saare main pages yahin central router me define ho rahe hain.
  const router = createBrowserRouter([
    {
      path: "/",
      element: <Layout />,
      children: [
        {
          path: "/Dashboardd",
          element: <Dashboard />,
        },
        {
          path: "/Auth",
          element: <Auth />,
        },
        {
          path: "/Intakee",
          element: <Intake />,
        },
        {
          path: "/Profile",
          element: <Profile />,
        },
        {
          index: true,
          element: <Landingg />,
        },
      ],
    },
  ]);

  return <RouterProvider router={router} />;
}

export default App;
