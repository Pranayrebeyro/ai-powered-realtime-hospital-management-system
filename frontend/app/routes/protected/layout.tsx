import {
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router";

import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";

import { authClient } from "@/lib/auth-client";
import type { Role } from "@/types";
import Loader from "@/components/global/Loader";
import { AppSidebar } from "@/components/navigation/app-sidebar";
import { useEffect } from "react";
import { toast } from "sonner";
import {
  getRouteConfig,
  navConfig,
} from "@/components/navigation/nav-config";
import Header from "@/components/navigation/Header";

const Layout = () => {
  const {
    data: session,
    isPending,
  } = authClient.useSession();

  const { pathname } = useLocation();
  const navigate = useNavigate();

  const userRole =
    (session?.user?.role as Role) ||
    "patient";

  useEffect(() => {
    if (isPending) return;

    /*
     * Include both normal navigation items
     * and admin-only navigation items.
     */
    const allNavItems = [
      ...navConfig.navMain,
      ...navConfig.navAdmin,
    ];

    /*
     * Find the configuration for the
     * currently requested route.
     */
    const currentRouteConfig =
      getRouteConfig(
        pathname,
        allNavItems,
      );

    /*
     * If this route has a configuration,
     * enforce its allowed roles.
     */
    if (currentRouteConfig) {
      const hasAccess =
        currentRouteConfig.allowedRoles.includes(
          userRole,
        );

      if (!hasAccess) {
        toast.error(
          "Unauthorized Access",
        );

        navigate("/dashboard", {
          replace: true,
        });
      }
    }
  }, [
    pathname,
    userRole,
    isPending,
    navigate,
  ]);

  /*
   * Wait for Better Auth session
   * initialization.
   */
  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader label="Initializing Medflow..." />
      </div>
    );
  }

  /*
   * User is not authenticated.
   */
  if (!session) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />

      <SidebarInset className="bg-card/50">
        <Header />

        <main className="my-4 px-4">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Layout;