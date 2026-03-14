import { useState } from "react";
import StartPage from "./pages/StartPage";
import DashboardPage from "./pages/DashboardPage";

export interface ExperimentMeta {
  metric: string;
  task_type: string;
}

export default function App() {
  const [meta, setMeta] = useState<ExperimentMeta | null>(null);

  return (
    <>
      {meta === null && (
        <StartPage onStarted={(m) => setMeta(m)} />
      )}
      {meta !== null && (
        <DashboardPage metric={meta.metric} taskType={meta.task_type} />
      )}
    </>
  );
}
