import { useEffect } from "react";
import Home from "@/pages/Home";

export default function Index() {
  console.log('Rendering Index component');

  useEffect(() => {
    console.log('Index component mounted');
  }, []);

  return <Home />;
}
