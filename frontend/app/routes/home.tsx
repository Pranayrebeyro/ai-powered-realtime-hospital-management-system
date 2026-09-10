import { Navigate } from "react-router";

export function meta() {
  return [
    { title: "MedFlow AI Hospital Management System" },
    {
      name: "description",
      content: "AI-powered realtime hospital management system",
    },
  ];
}

export default function Home() {
  return <Navigate to="/login" replace />;
}