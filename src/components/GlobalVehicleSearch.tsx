import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Car, AlertTriangle, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

type Vehicle = Tables<"vehicles">;

interface SearchResult extends Vehicle {
  violationCount?: number;
}

export default function GlobalVehicleSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Debounced search
  const searchVehicles = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    try {
      // Search vehicles by plate number
      const { data: vehicles, error } = await supabase
        .from("vehicles")
        .select("*")
        .ilike("plate_number", `%${searchQuery}%`)
        .limit(10);

      if (error) throw error;

      // Get violation counts for each vehicle
      const resultsWithViolations: SearchResult[] = await Promise.all(
        (vehicles || []).map(async (vehicle) => {
          const { count } = await supabase
            .from("violations")
            .select("*", { count: "exact", head: true })
            .eq("vehicle_id", vehicle.id);

          return {
            ...vehicle,
            violationCount: count || 0,
          };
        })
      );

      setResults(resultsWithViolations);
      setSelectedIndex(0);
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchVehicles(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, searchVehicles]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % results.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
        break;
      case "Enter":
        e.preventDefault();
        handleSelectVehicle(results[selectedIndex]);
        break;
      case "Escape":
        setIsOpen(false);
        inputRef.current?.blur();
        break;
    }
  };

  const handleSelectVehicle = (vehicle: SearchResult) => {
    setQuery("");
    setIsOpen(false);
    navigate(`/dashboard/vehicles?plate=${encodeURIComponent(vehicle.plate_number)}`);
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    inputRef.current?.focus();
  };

  const getVehicleTypeIcon = (type: string) => {
    switch (type) {
      case "two_wheeler":
        return "🏍️";
      case "commercial":
        return "🚛";
      default:
        return "🚗";
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search vehicle plates..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="pl-10 pr-10 h-9 bg-background/50 border-muted"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Dropdown results */}
      {isOpen && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-50 overflow-hidden">
          {results.length === 0 && !isLoading ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No vehicles found for "{query}"
            </div>
          ) : (
            <ScrollArea className="max-h-[300px]">
              {results.map((vehicle, index) => (
                <button
                  key={vehicle.id}
                  onClick={() => handleSelectVehicle(vehicle)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent transition-colors",
                    index === selectedIndex && "bg-accent"
                  )}
                >
                  <div className="flex-shrink-0 text-xl">
                    {getVehicleTypeIcon(vehicle.vehicle_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-sm">
                        {vehicle.plate_number}
                      </span>
                      {vehicle.is_blacklisted && (
                        <Badge variant="destructive" className="text-[10px] px-1 py-0">
                          BLACKLIST
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {vehicle.make && vehicle.model && (
                        <span>{vehicle.make} {vehicle.model}</span>
                      )}
                      {vehicle.color && (
                        <span className="capitalize">• {vehicle.color}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-1">
                    {vehicle.violationCount && vehicle.violationCount > 0 ? (
                      <Badge variant="outline" className="text-destructive border-destructive/30">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        {vehicle.violationCount}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-green-600 border-green-600/30">
                        Clean
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </ScrollArea>
          )}

          {/* Keyboard hints */}
          <div className="px-3 py-2 border-t bg-muted/50 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              <kbd className="px-1 py-0.5 rounded bg-muted border text-[10px]">↑↓</kbd> Navigate
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded bg-muted border text-[10px]">Enter</kbd> Select
            </span>
            <span>
              <kbd className="px-1 py-0.5 rounded bg-muted border text-[10px]">Esc</kbd> Close
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
