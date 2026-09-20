"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiCache } from "@/lib/cache/api-cache";

export interface PropertyInfo {
  id: string;
  code: string;
  displayName: string;
  legalName: string;
  gstin?: string;
  stateCode?: string;
  address?: string | null;
  phone?: string | null;
  businessDate: string;
  currency: string;
}

export interface UserInfo {
  id: string;
  name: string;
  username: string;
  email: string;
  activeRole: string;
  roleName: string;
}

interface HotelContextType {
  user: UserInfo | null;
  activeProperty: PropertyInfo | null;
  availableProperties: PropertyInfo[];
  allUsers: Array<{
    id: string;
    name: string;
    username: string;
    email: string;
    role: string;
    roleName: string;
    propertyScope?: string;
  }>;
  isLoading: boolean;
  isInitialized: boolean | null;
  activeRole: string;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  mobileMenuOpen: boolean;
  toggleMobileMenu: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  switchProperty: (propertyId: string) => void;
  switchUser: (identifier: string) => void;
  logout: () => void;
  refreshData: () => Promise<void>;
  triggerRefresh: () => void;
  refreshKey: number;
}

const INITIAL_USER: UserInfo = {
  id: "usr_bijesh",
  name: "Bijesh Singha",
  username: "bijesh_singha",
  email: "bijesh.singha@hotelos.in",
  activeRole: "ORG_OWNER",
  roleName: "Organization Owner & Super Admin",
};

const HotelContext = createContext<HotelContextType | undefined>(undefined);

export function HotelProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(INITIAL_USER);
  const [activeProperty, setActiveProperty] = useState<PropertyInfo | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("hotel_os_active_property_data");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.id) return parsed;
        }
      } catch (e) {
        console.warn("Failed to parse saved property:", e);
      }
    }
    return null;
  });
  const [availableProperties, setAvailableProperties] = useState<PropertyInfo[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("hotel_os_available_properties_data");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {}
    }
    return [];
  });
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Initialize sidebar collapsed state from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("hotel_sidebar_collapsed");
      if (saved !== null) {
        setSidebarCollapsedState(saved === "true");
      }
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsedState((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("hotel_sidebar_collapsed", String(next));
      }
      return next;
    });
  }, []);

  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    setSidebarCollapsedState(collapsed);
    if (typeof window !== "undefined") {
      localStorage.setItem("hotel_sidebar_collapsed", String(collapsed));
    }
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen((prev) => !prev);
  }, []);

  const fetchSession = useCallback(async (identifier?: string, propId?: string) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (identifier) params.set("username", identifier);
      if (propId) params.set("propertyId", propId);

      const res = await fetch(`/api/v1/auth/session?${params.toString()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (res.ok) {
        const data = await res.json();

        if (data?.initialized === false) {
          setIsInitialized(false);
          setUser(null);
          setActiveProperty(null);
          setAvailableProperties([]);
          setAllUsers([]);
          if (typeof window !== "undefined") {
            localStorage.removeItem("hotel_os_property");
            localStorage.removeItem("hotel_os_active_property_data");
            localStorage.removeItem("hotel_os_available_properties_data");
            if (!window.location.pathname.startsWith("/onboarding")) {
              window.location.href = "/onboarding";
              return;
            }
          }
        } else {
          setIsInitialized(true);
        }

        if (data?.user) {
          setUser(data.user);
          if (typeof window !== "undefined" && data.user.username) {
            localStorage.setItem("hotel_os_user", data.user.username);
          }
        }
        if (data?.activeProperty) {
          setActiveProperty(data.activeProperty);
          if (typeof window !== "undefined") {
            localStorage.setItem("hotel_os_property", data.activeProperty.id);
            localStorage.setItem("hotel_os_active_property_data", JSON.stringify(data.activeProperty));
          }
        }
        if (Array.isArray(data?.availableProperties)) {
          setAvailableProperties(data.availableProperties);
          if (typeof window !== "undefined") {
            localStorage.setItem("hotel_os_available_properties_data", JSON.stringify(data.availableProperties));
          }
        }
        if (Array.isArray(data?.allUsers)) setAllUsers(data.allUsers);
      }
    } catch {
      // Graceful fallback during dev hot-reloads
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const savedUser = typeof window !== "undefined" ? localStorage.getItem("hotel_os_user") : null;
    const savedProp = typeof window !== "undefined" ? localStorage.getItem("hotel_os_property") : null;
    fetchSession(savedUser || undefined, savedProp || undefined);
  }, [fetchSession]);

  const switchProperty = (propertyId: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("hotel_os_property", propertyId);
    }
    apiCache.invalidate();
    const targetProp = availableProperties.find((p) => p.id === propertyId);
    if (targetProp) {
      setActiveProperty(targetProp);
      if (typeof window !== "undefined") {
        localStorage.setItem("hotel_os_active_property_data", JSON.stringify(targetProp));
      }
    }
    fetchSession(user?.username || user?.email, propertyId);
    setRefreshKey((k) => k + 1);
  };

  const switchUser = (identifier: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("hotel_os_user", identifier);
    }
    apiCache.invalidate();
    const savedProp = typeof window !== "undefined" ? localStorage.getItem("hotel_os_property") : null;
    fetchSession(identifier, savedProp || undefined);
    setRefreshKey((k) => k + 1);
  };

  const logout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("hotel_os_user");
    }
    setUser(null);
    window.location.href = "/login";
  };

  const triggerRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  const refreshData = async () => {
    await fetchSession(user?.username || user?.email, activeProperty?.id);
    setRefreshKey((k) => k + 1);
  };

  return (
    <HotelContext.Provider
      value={{
        user,
        activeProperty,
        availableProperties,
        allUsers,
        isLoading,
        isInitialized,
        activeRole: user?.activeRole || "ORG_OWNER",
        sidebarCollapsed,
        toggleSidebar,
        setSidebarCollapsed,
        mobileMenuOpen,
        toggleMobileMenu,
        setMobileMenuOpen,
        switchProperty,
        switchUser,
        logout,
        refreshData,
        triggerRefresh,
        refreshKey,
      }}
    >
      {children}
    </HotelContext.Provider>
  );
}

export function useHotel() {
  const context = useContext(HotelContext);
  if (!context) {
    throw new Error("useHotel must be used within a HotelProvider");
  }
  return context;
}
