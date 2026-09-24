"use client";

import { useEffect, useState } from "react";
import { useHotel } from "@/lib/context/hotel-context";

export function useDashboardMetrics() {
  const { activeProperty, refreshKey, isInitialized, isLoading: contextLoading } = useHotel();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isInitialized === false && typeof window !== "undefined") {
      window.location.href = "/onboarding";
      return;
    }

    if (!activeProperty) return;
    setLoading(true);
    fetch(`/api/v1/dashboard?propertyId=${activeProperty.id}`)
      .then((res) => res.json())
      .then((d) => setData(d))
      .catch((err) => console.error("Dashboard error:", err))
      .finally(() => setLoading(false));
  }, [activeProperty, refreshKey, isInitialized]);

  return {
    activeProperty,
    isInitialized,
    contextLoading,
    data,
    loading,
  };
}
