import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Tables, Database } from "@/integrations/supabase/types";

type Violation = Tables<"violations">;
type GateEntryLog = Tables<"gate_entry_logs">;
type ViolationType = Database["public"]["Enums"]["violation_type"];

const violationTypeLabels: Record<ViolationType, string> = {
  helmet: "No Helmet",
  seatbelt: "No Seatbelt",
  triple_riding: "Triple Riding",
  mobile_phone: "Mobile Phone Usage",
  wrong_way: "Wrong Way",
  red_light: "Red Light",
  illegal_parking: "Illegal Parking",
  overloading: "Overloading",
  other: "Other",
};

interface UseRealtimeNotificationsOptions {
  onNewViolation?: (violation: Violation) => void;
  onNewGateEntry?: (entry: GateEntryLog) => void;
}

export function useRealtimeNotifications(options: UseRealtimeNotificationsOptions = {}) {
  const { toast } = useToast();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const showViolationNotification = useCallback((violation: Violation) => {
    const typeLabel = violationTypeLabels[violation.violation_type] || "Unknown";
    toast({
      title: "🚨 New Violation Detected",
      description: `${typeLabel} - Severity: ${violation.severity || "medium"}`,
      variant: "destructive",
    });
    options.onNewViolation?.(violation);
  }, [toast, options]);

  const showGateEntryNotification = useCallback((entry: GateEntryLog) => {
    const actionEmoji = entry.action === "entry" ? "🚗" : entry.action === "exit" ? "🚙" : "🚫";
    const actionLabel = entry.action === "denied" ? "Access Denied" : `Vehicle ${entry.action}`;
    
    toast({
      title: `${actionEmoji} ${actionLabel}`,
      description: `Plate: ${entry.plate_number}`,
      variant: entry.action === "denied" ? "destructive" : "default",
    });
    options.onNewGateEntry?.(entry);
  }, [toast, options]);

  useEffect(() => {
    // Subscribe to real-time changes
    channelRef.current = supabase
      .channel("realtime-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "violations",
        },
        (payload) => {
          console.log("New violation:", payload);
          showViolationNotification(payload.new as Violation);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "gate_entry_logs",
        },
        (payload) => {
          console.log("New gate entry:", payload);
          showGateEntryNotification(payload.new as GateEntryLog);
        }
      )
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
      });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [showViolationNotification, showGateEntryNotification]);

  return { channel: channelRef.current };
}
