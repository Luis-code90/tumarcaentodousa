import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import Layout from "./Layout";
import Landing from "./pages/Landing";
import NotFound from "./pages/NotFound";
import CatalogoMerch from "./CatalogoMerch";
import Globos from "./Globos";
import AdminLogin from "./admin/AdminLogin";
import AdminLayout from "./admin/AdminLayout";
import RequireAdmin from "./admin/RequireAdmin";
import MerchList from "./admin/MerchList";
import MerchForm from "./admin/MerchForm";
import GlobosList from "./admin/GlobosList";
import GlobosForm from "./admin/GlobosForm";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/merch" element={<CatalogoMerch />} />
            <Route path="/globos" element={<Globos />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminLayout />
              </RequireAdmin>
            }
          >
            <Route index element={<Navigate to="merch" replace />} />
            <Route path="merch" element={<MerchList />} />
            <Route path="merch/nuevo" element={<MerchForm />} />
            <Route path="merch/:slug" element={<MerchForm />} />
            <Route path="globos" element={<GlobosList />} />
            <Route path="globos/nuevo" element={<GlobosForm />} />
            <Route path="globos/:slug" element={<GlobosForm />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
