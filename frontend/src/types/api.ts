// Mirrors grocery-api/docs/hld-api-spec.md exactly. Keep in sync with the
// backend spec — if the API changes, fix here and re-check every caller.

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiErrorBody;

export interface User {
  id: number;
  username: string;
  roleId: number;
  // Live permission codes for the user's role, read fresh from
  // role_permissions on every login/`/auth/me` call — never hardcoded
  // client-side, since that would drift from the backend's real table.
  permissions: string[];
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface Product {
  id: number;
  barcode: string | null;
  name: string;
  price: string;
  cost: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StockTransaction {
  id: number;
  product_id: number;
  type: "IN" | "OUT" | "ADJUST" | "SALE";
  quantity: number;
  note: string | null;
  created_by: number;
  created_at: string;
}

export interface StockBalance {
  productId: number;
  balance: number;
}

export interface SaleItem {
  id: number;
  sale_id: number;
  product_id: number;
  quantity: number;
  price: string;
  subtotal: string;
}

export interface Sale {
  id: number;
  sale_no: string;
  total_amount: string;
  created_by: number;
  created_at: string;
  items?: SaleItem[];
}

export interface DashboardMetrics {
  todaySales: { count: number; totalAmount: number };
  totalActiveProducts: number;
  outOfStockProducts: { id: number; name: string }[];
  topProducts: { productId: number; name: string; totalQuantitySold: number }[];
}

export interface SalesReport {
  startDate: string;
  endDate: string;
  totalSales: number;
  totalRevenue: number;
  dailyBreakdown: { date: string; count: number; revenue: number }[];
}

export interface ProductsReport {
  startDate: string;
  endDate: string;
  products: { productId: number; name: string; quantitySold: number; revenue: number }[];
}
