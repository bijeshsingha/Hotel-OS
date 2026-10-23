"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { apiCache } from "@/lib/cache/api-cache";
import { authRequest } from "@/lib/auth/client-request";

export interface PropertyInfo {
  timezone?: string;
  id: string;
  code: string;
  displayName: string;
  legalName: string;
  gstin?: string;
  stateCode?: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  logoUrl?: string | null;
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
  sessionError: string | null;
  retrySession: () => Promise<void>;
  isInitialized: boolean | null;
  activeRole: string;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  mobileMenuOpen: boolean;
  toggleMobileMenu: () => void;
  setMobileMenuOpen: (open: boolean) => void;
  switchProperty: (propertyId: string) => void;
  switchUser: (identifier: string) => Promise<void>;
  logout: () => void;
  refreshData: () => Promise<void>;
  triggerRefresh: () => void;
  refreshKey: number;
}


const HotelContext = createContext<HotelContextType | undefined>(undefined);

// Browser storage is only a preference; blocked storage must not stop authentication.
function readPreference(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function writePreference(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* Optional preference. */ }
}
function removePreference(key: string) {
  try { localStorage.removeItem(key); } catch { /* Optional preference. */ }
}

export function HotelProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [activeProperty, setActiveProperty] = useState<PropertyInfo | null>(null);
  const [availableProperties, setAvailableProperties] = useState<PropertyInfo[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const sessionRequest = useRef(0);
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsedState] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Initialize sidebar collapsed state from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = readPreference("hotel_sidebar_collapsed");
      if (saved !== null) {
        setSidebarCollapsedState(saved === "true");
      }
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsedState((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        writePreference("hotel_sidebar_collapsed", String(next));
      }
      return next;
    });
  }, []);

  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    setSidebarCollapsedState(collapsed);
    if (typeof window !== "undefined") {
      writePreference("hotel_sidebar_collapsed", String(collapsed));
    }
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen((prev) => !prev);
  }, []);

  const fetchSession = useCallback(async (identifier?: string, propId?: string, silent = false) => {
    const requestId = ++sessionRequest.current;
    const isCurrent = () => sessionRequest.current === requestId;
    try {
      if (!silent) setIsLoading(true);
      setSessionError(null);
      const params = new URLSearchParams();
      // Identity is determined by the HttpOnly session cookie.
      if (propId) params.set("propertyId", propId);

      let result = await authRequest(`/api/v1/auth/session?${params.toString()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      if (!isCurrent()) return false;
      if (result.response.status === 403 && propId) {
        // A shared terminal may remember a property the newly signed-in user cannot access.
        result = await authRequest("/api/v1/auth/session", { cache: "no-store" });
      }
      if (!isCurrent()) return false;
      const { response: res, data } = result;
      if (res.status === 401) {
        setUser(null);
        setAllUsers([]);
        setActiveProperty(null);
        setAvailableProperties([]);
        setIsInitialized(true);
        // An optional public directory must never delay a signed-out redirect.
        setIsLoading(false);
        apiCache.invalidate();
        removePreference("hotel_os_user");
        removePreference("hotel_os_active_property_data");
        removePreference("hotel_os_available_properties_data");
        try {
          const directory = await authRequest("/api/v1/public/properties", { cache: "no-store" });
          if (isCurrent() && directory.response.ok) {
            const properties = Array.isArray(directory.data?.properties) ? directory.data.properties : [];
            setAvailableProperties(properties);
            setActiveProperty(properties.find((p: PropertyInfo) => p.id === propId) || properties[0] || null);
          }
        } catch { /* The login page remains available if the public directory is offline. */ }
        return false;
      } else if (res.ok) {

        if (data?.initialized === false) {
          setIsInitialized(false);
          setUser(null);
          setActiveProperty(null);
          setAvailableProperties([]);
          setAllUsers([]);
          if (typeof window !== "undefined") {
            removePreference("hotel_os_property");
            removePreference("hotel_os_active_property_data");
            removePreference("hotel_os_available_properties_data");
            if (!window.location.pathname.startsWith("/onboarding")) {
              window.location.href = "/onboarding";
              return;
            }
          }
        } else {
          if (!data?.user?.id) throw new Error("Hotel OS could not verify your session. Please try again.");
          setIsInitialized(true);
        }

        if (data?.user) {
          setUser(data.user);
          if (typeof window !== "undefined" && data.user.username) {
            writePreference("hotel_os_user", data.user.username);
          }
        }
        setActiveProperty(data.activeProperty || null);
        if (data?.activeProperty) {
          if (typeof window !== "undefined") {
            writePreference("hotel_os_property", data.activeProperty.id);
            writePreference("hotel_os_active_property_data", JSON.stringify(data.activeProperty));
          }
        }
        if (Array.isArray(data?.availableProperties)) {
          setAvailableProperties(data.availableProperties);
          if (typeof window !== "undefined") {
            writePreference("hotel_os_available_properties_data", JSON.stringify(data.availableProperties));
          }
        }
        if (Array.isArray(data?.allUsers)) setAllUsers(data.allUsers);
        return Boolean(data?.user?.id);
      } else {
        throw new Error("Hotel OS could not verify your access. Please try again.");
      }
    } catch (error) {
      if (isCurrent()) setSessionError(error instanceof Error ? error.message : "Unable to check access. Please try again.");
      return false;
    } finally {
      if (isCurrent()) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const savedUser = typeof window !== "undefined" ? readPreference("hotel_os_user") : null;
    const savedProp = typeof window !== "undefined" ? readPreference("hotel_os_property") : null;
    fetchSession(savedUser || undefined, savedProp || undefined);
    return () => { sessionRequest.current++; };
  }, [fetchSession]);

  const switchProperty = (propertyId: string) => {
    apiCache.invalidate();
    fetchSession(undefined, propertyId).then((verified) => {
      if (verified) setRefreshKey((k) => k + 1);
    });
  };

  const switchUser = async (identifier: string) => {
    setUser(null);
    setActiveProperty(null);
    setAvailableProperties([]);
    setAllUsers([]);
    setIsLoading(true);
    if (typeof window !== "undefined") {
      writePreference("hotel_os_user", identifier);
    }
    apiCache.invalidate();
    const savedProp = typeof window !== "undefined" ? readPreference("hotel_os_property") : null;
    const verified = await fetchSession(undefined, savedProp || undefined);
    if (!verified) throw new Error("Sign-in could not be completed. Please try again.");
    setRefreshKey((k) => k + 1);
  };

  const logout = async () => {
    const { response } = await authRequest("/api/v1/auth/session", { method: "DELETE" });
    if (!response.ok) throw new Error("Sign out failed. Please try again.");
    sessionRequest.current++;
    apiCache.invalidate();
    removePreference("hotel_os_active_property_data");
    removePreference("hotel_os_available_properties_data");
    if (typeof window !== "undefined") {
      removePreference("hotel_os_user");
    }
    setUser(null);
    window.location.href = "/login";
  };

  const triggerRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  const refreshData = async () => {
    await fetchSession(user?.username || user?.email, activeProperty?.id, true);
    setRefreshKey((k) => k + 1);
  };

  const retrySession = async () => {
    const savedProp = readPreference("hotel_os_property");
    await fetchSession(undefined, savedProp || activeProperty?.id);
  };

  return (
    <HotelContext.Provider
      value={{
        user,
        activeProperty,
        availableProperties,
        allUsers,
        isLoading,
        sessionError,
        retrySession,
        isInitialized,
        activeRole: user?.activeRole || "UNASSIGNED",
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
