"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

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
  activeRole: string;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  switchProperty: (propertyId: string) => void;
  switchUser: (identifier: string) => void;
  logout: () => void;
  refreshData: () => Promise<void>;
  refreshKey: number;
}

const INITIAL_PROPERTY: PropertyInfo = {
  id: "prop_ambarish",
  code: "GUW-01",
  displayName: "Hotel Ambarish Grand Residency",
  legalName: "AMBARISH RESIDENCY",
  gstin: "18AACCB2447F1ZX",
  stateCode: "18",
  businessDate: typeof window !== "undefined" ? new Date().toLocaleDateString("en-CA") : new Date().toISOString().split("T")[0],
  currency: "INR",
};

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
  const [activeProperty, setActiveProperty] = useState<PropertyInfo | null>(INITIAL_PROPERTY);
  const [availableProperties, setAvailableProperties] = useState<PropertyInfo[]>([INITIAL_PROPERTY]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(false);

  // Initialize sidebar collapsed state from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("hotel_sidebar_collapsed");
      if (saved === "true") {
        setSidebarCollapsedState(true);
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

  // Ensure root dark mode is fixed
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

  const fetchSession = useCallback(async (identifier?: string, propId?: string) => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (identifier) params.set("username", identifier);
      if (propId) params.set("propertyId", propId);

      const res = await fetch(`/api/v1/auth/session?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
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
          }
        }
        if (Array.isArray(data?.availableProperties)) setAvailableProperties(data.availableProperties);
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
    fetchSession(user?.username || user?.email, propertyId);
    setRefreshKey((k) => k + 1);
  };

  const switchUser = (identifier: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("hotel_os_user", identifier);
    }
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

  const refreshData = async () => {
    if (activeProperty) {
      await fetchSession(user?.username || user?.email, activeProperty.id);
      setRefreshKey((k) => k + 1);
    }
  };

  return (
    <HotelContext.Provider
      value={{
        user,
        activeProperty,
        availableProperties,
        allUsers,
        isLoading,
        activeRole: user?.activeRole || "ORG_OWNER",
        sidebarCollapsed,
        toggleSidebar,
        setSidebarCollapsed,
        switchProperty,
        switchUser,
        logout,
        refreshData,
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
