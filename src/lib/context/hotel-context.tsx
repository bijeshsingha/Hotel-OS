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
  switchProperty: (propertyId: string) => void;
  switchUser: (identifier: string) => void;
  logout: () => void;
  refreshData: () => Promise<void>;
  refreshKey: number;
}

const HotelContext = createContext<HotelContextType | undefined>(undefined);

export function HotelProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [activeProperty, setActiveProperty] = useState<PropertyInfo | null>(null);
  const [availableProperties, setAvailableProperties] = useState<PropertyInfo[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

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
        if (data?.activeProperty) setActiveProperty(data.activeProperty);
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
    const saved = typeof window !== "undefined" ? localStorage.getItem("hotel_os_user") : null;
    fetchSession(saved || undefined);
  }, [fetchSession]);

  const switchProperty = (propertyId: string) => {
    fetchSession(user?.username || user?.email, propertyId);
    setRefreshKey((k) => k + 1);
  };

  const switchUser = (identifier: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("hotel_os_user", identifier);
    }
    fetchSession(identifier);
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
