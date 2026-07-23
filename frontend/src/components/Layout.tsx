import { NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import LanguageSwitcher from "./LanguageSwitcher";

const NAV_ITEMS = [
  { to: "/", labelKey: "nav.dashboard", icon: "📊" },
  { to: "/products", labelKey: "nav.products", icon: "📦" },
  { to: "/inventory", labelKey: "nav.inventory", icon: "🗃️" },
  { to: "/sales", labelKey: "nav.sales", icon: "🧾" },
  { to: "/reports", labelKey: "nav.reports", icon: "📈" },
] as const;

const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
  `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs sm:flex-row sm:gap-2 sm:px-3 sm:py-2 sm:text-sm rounded-lg ${
    isActive
      ? "text-emerald-700 font-medium sm:bg-emerald-50"
      : "text-gray-500 hover:text-gray-800"
  }`;

export default function Layout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <span className="text-lg font-semibold text-gray-900">{t("auth.appName")}</span>
          <nav className="hidden sm:flex sm:gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === "/"} className={navLinkClasses}>
                <span>{item.icon}</span>
                <span>{t(item.labelKey)}</span>
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <span className="hidden text-sm text-gray-600 sm:inline">{user?.username}</span>
          <button
            onClick={logout}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
          >
            {t("common.logout")}
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 pb-20 sm:px-6 sm:pb-4">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 flex border-t border-gray-200 bg-white sm:hidden">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === "/"} className={navLinkClasses}>
            <span className="text-lg">{item.icon}</span>
            <span>{t(item.labelKey)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
