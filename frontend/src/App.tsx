import { Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./features/auth/pages/Login";
import Dashboard from "./features/dashboard/pages/Dashboard";
import ProductList from "./features/products/pages/ProductList";
import Inventory from "./features/inventory/pages/Inventory";
import SalesPos from "./features/sales/pages/SalesPos";
import Reports from "./features/reports/pages/Reports";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/products" element={<ProductList />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/sales" element={<SalesPos />} />
          <Route path="/reports" element={<Reports />} />
        </Route>
      </Route>
    </Routes>
  );
}
