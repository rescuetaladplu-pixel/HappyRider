import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export interface RiderProfile {
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
}

export interface RiderRow {
  vehicle_type: string | null;
  license_plate: string | null;
  is_online: boolean;
  is_approved: boolean;
  current_lat: number | null;
  current_lng: number | null;
}

interface RiderContextValue {
  profile: RiderProfile | null;
  rider: RiderRow | null;
  loading: boolean;
  isProfileComplete: boolean;
  refresh: () => Promise<void>;
  toggleOnline: () => Promise<void>;
}

const RiderContext = createContext<RiderContextValue | undefined>(undefined);


function haversine(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function RiderProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<RiderProfile | null>(null);
  const [rider, setRider] = useState<RiderRow | null>(null);
  const [loading, setLoading] = useState(true);

  const watchIdRef = useRef<number | null>(null);
  const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastWriteRef = useRef<{ lat: number; lng: number; at: number } | null>(
    null,
  );

  const fetchAll = useCallback(async () => {
    if (!user) return;
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase
        .from("profiles")
        .select("first_name, last_name, phone, avatar_url")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("riders")
        .select(
          "vehicle_type, license_plate, is_online, is_approved, current_lat, current_lng",
        )
        .eq("id", user.id)
        .maybeSingle(),
    ]);
    setProfile((p as RiderProfile) ?? null);
    setRider((r as RiderRow) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setRider(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchAll();
  }, [user, fetchAll]);

  const stopWatch = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== "undefined") {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalIdRef.current !== null) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    lastWriteRef.current = null;
  }, []);

  const writePosition = useCallback(
    async (latitude: number, longitude: number) => {
      if (!user) return;
      const now = Date.now();
      const last = lastWriteRef.current;
      // Skip only if very recent AND barely moved (avoid spamming on burst events)
      if (last) {
        const dt = now - last.at;
        const dist = haversine(last.lat, last.lng, latitude, longitude);
        if (dt < 5_000 && dist < 5) return;
      }
      lastWriteRef.current = { lat: latitude, lng: longitude, at: now };
      const { error } = await supabase
        .from("riders")
        .update({ current_lat: latitude, current_lng: longitude })
        .eq("id", user.id);
      if (!error) {
        setRider((prev) =>
          prev
            ? { ...prev, current_lat: latitude, current_lng: longitude }
            : prev,
        );
      }
    },
    [user],
  );

  const startWatch = useCallback(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) return;
    if (watchIdRef.current !== null) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        void writePosition(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        console.warn("geolocation error:", err.message);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );

    // Periodic forced refresh every 15s — keeps coords fresh even when
    // the rider is stationary, so OSRM ranking on the happyeat side
    // always sees up-to-date positions.
    intervalIdRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          void writePosition(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => {
          console.warn("geolocation interval error:", err.message);
        },
        { enableHighAccuracy: true, maximumAge: 10_000, timeout: 8_000 },
      );
    }, 15_000);
  }, [user, writePosition]);

  // Manage watch lifecycle based on online state
  useEffect(() => {
    if (rider?.is_online) {
      startWatch();
    } else {
      stopWatch();
    }
    return stopWatch;
  }, [rider?.is_online, startWatch, stopWatch]);

  // Stop watch on tab close
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => stopWatch();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [stopWatch]);

  const requestPosition = () =>
    new Promise<GeolocationPosition>((resolve, reject) => {
      if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
        reject(new Error("geolocation_unsupported"));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
      });
    });

  const toggleOnline = useCallback(async () => {
    if (!user || !rider) return;
    const next = !rider.is_online;
    if (next) {
      // Going online → require geolocation
      try {
        const pos = await requestPosition();
        const { error } = await supabase
          .from("riders")
          .update({
            is_online: true,
            current_lat: pos.coords.latitude,
            current_lng: pos.coords.longitude,
          })
          .eq("id", user.id);
        if (error) throw error;
        lastWriteRef.current = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          at: Date.now(),
        };
        setRider({
          ...rider,
          is_online: true,
          current_lat: pos.coords.latitude,
          current_lng: pos.coords.longitude,
        });
        toast.success("ออนไลน์แล้ว — พร้อมรับงาน");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        toast.error(
          msg === "geolocation_unsupported"
            ? "อุปกรณ์ของคุณไม่รองรับการระบุพิกัด"
            : "ต้องอนุญาตการระบุพิกัดก่อนถึงจะออนไลน์ได้",
        );
      }
    } else {
      const { error } = await supabase
        .from("riders")
        .update({ is_online: false, current_lat: null, current_lng: null })
        .eq("id", user.id);
      if (error) {
        toast.error("ออฟไลน์ไม่สำเร็จ");
        return;
      }
      setRider({
        ...rider,
        is_online: false,
        current_lat: null,
        current_lng: null,
      });
      toast.success("ออฟไลน์แล้ว");
    }
  }, [user, rider]);

  const isProfileComplete = !!(
    profile?.first_name &&
    profile?.last_name &&
    profile?.phone
  );

  return (
    <RiderContext.Provider
      value={{
        profile,
        rider,
        loading,
        isProfileComplete,
        refresh: fetchAll,
        toggleOnline,
      }}
    >
      {children}
    </RiderContext.Provider>
  );
}

export function useRider() {
  const ctx = useContext(RiderContext);
  if (!ctx) throw new Error("useRider must be used within RiderProvider");
  return ctx;
}
