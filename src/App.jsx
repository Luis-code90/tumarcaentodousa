import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./Layout";
import Landing from "./pages/Landing";
import CatalogoMerch from "./CatalogoMerch";
import Globos from "./Globos";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/merch" element={<CatalogoMerch />} />
          <Route path="/globos" element={<Globos />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
