import { useState } from "react";
import StartPage from "./pages/StartPage";
import DashboardPage from "./pages/DashboardPage";

export type Page = "start" | "dashboard";

export default function App() {
  const [page, setPage] = useState<Page>("start");

  return (
    <>
      {page === "start" && <StartPage onStarted={() => setPage("dashboard")} />}
      {page === "dashboard" && <DashboardPage />}
    </>
  );
}
