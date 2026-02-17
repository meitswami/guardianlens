import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { plate_number } = await req.json();
    if (!plate_number) throw new Error("plate_number is required");

    const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_KEY");

    if (!RAPIDAPI_KEY) {
      // Return mock data when API key not configured
      console.log("RAPIDAPI_KEY not configured, returning mock data for:", plate_number);
      const stateCode = plate_number.substring(0, 2).toUpperCase();
      const stateMap: Record<string, string> = {
        RJ: "Rajasthan", TS: "Telangana", MH: "Maharashtra", DL: "Delhi",
        KA: "Karnataka", TN: "Tamil Nadu", AP: "Andhra Pradesh", GJ: "Gujarat",
      };
      return new Response(JSON.stringify({
        success: true,
        mock: true,
        data: {
          plate_number,
          owner_name: "Vehicle Owner (Demo)",
          owner_phone: "+919876543210",
          owner_address: `123 Main Road, ${stateMap[stateCode] || "Unknown State"}`,
          vehicle_type: "car",
          vehicle_make: "Maruti Suzuki",
          vehicle_model: "Swift",
          vehicle_color: "White",
          registration_date: "2022-01-15",
          insurance_valid_until: "2025-01-14",
          fitness_valid_until: "2037-01-14",
          rto_office: `RTO ${stateCode}-01`,
          state: stateMap[stateCode] || stateCode,
          fuel_type: "Petrol",
          engine_number: "K12M-" + Math.random().toString(36).substring(2, 9).toUpperCase(),
          chassis_number: "MA3" + Math.random().toString(36).substring(2, 14).toUpperCase(),
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Real API call to RapidAPI vehicle lookup
    const response = await fetch(
      `https://rto-vehicle-details.p.rapidapi.com/api3`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-rapidapi-host": "rto-vehicle-details.p.rapidapi.com",
          "x-rapidapi-key": RAPIDAPI_KEY,
        },
        body: JSON.stringify({ vehicle_number: plate_number }),
      }
    );

    const responseText = await response.text();
    
    const stateCode = plate_number.replace(/[^A-Za-z]/g, "").substring(0, 2).toUpperCase();
    const notFoundResponse = () => new Response(JSON.stringify({
      success: true, mock: true, not_found: true,
      data: {
        plate_number, owner_name: "N/A", owner_phone: null, owner_address: "N/A",
        vehicle_type: "car", vehicle_make: "N/A", vehicle_model: "N/A", vehicle_color: "N/A",
        registration_date: null, insurance_valid_until: null, fitness_valid_until: null,
        rto_office: "N/A", state: stateCode, fuel_type: "N/A", engine_number: "N/A", chassis_number: "N/A",
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (!response.ok) {
      console.error("RapidAPI error:", response.status, responseText);
      return notFoundResponse();
    }

    if (!responseText || responseText.trim() === "") {
      console.log("Empty response from RTO API for:", plate_number);
      return notFoundResponse();
    }

    let apiData;
    try {
      apiData = JSON.parse(responseText);
    } catch {
      console.error("Failed to parse RapidAPI response:", responseText.substring(0, 200));
      return notFoundResponse();
    }

    console.log("RapidAPI raw response:", JSON.stringify(apiData));
    
    if (apiData.error || apiData.status === 404) {
      // Vehicle not found in RTO database - return empty result with not_found flag
      console.log("Vehicle not found in RTO:", plate_number, apiData.error);
      const stateCode = plate_number.substring(0, 2).toUpperCase();
      return new Response(JSON.stringify({
        success: true,
        mock: true,
        not_found: true,
        data: {
          plate_number,
          owner_name: "N/A",
          owner_phone: null,
          owner_address: "N/A",
          vehicle_type: "car",
          vehicle_make: "N/A",
          vehicle_model: "N/A",
          vehicle_color: "N/A",
          registration_date: null,
          insurance_valid_until: null,
          fitness_valid_until: null,
          rto_office: "N/A",
          state: stateCode,
          fuel_type: "N/A",
          engine_number: "N/A",
          chassis_number: "N/A",
        },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = apiData.result || apiData;

    return new Response(JSON.stringify({
      success: true,
      mock: false,
      data: {
        plate_number,
        owner_name: result.owner_name || "N/A",
        owner_phone: result.mobile_number || null,
        owner_address: result.present_address || result.permanent_address || "N/A",
        vehicle_type: result.class || "car",
        vehicle_make: result.brand_name || "N/A",
        vehicle_model: result.brand_model || "N/A",
        vehicle_color: result.color || "N/A",
        registration_date: result.registration_date || null,
        insurance_valid_until: result.insurance_expiry || null,
        fitness_valid_until: result.pucc_upto || null,
        rto_office: result.rto_name || "N/A",
        state: result.state || plate_number.substring(0, 2),
        fuel_type: result.fuel_type || "N/A",
        engine_number: result.engine_number || "N/A",
        chassis_number: result.chassis_number || "N/A",
        father_name: result.father_name || null,
        rc_status: result.rc_status || null,
        insurance_company: result.insurance_company || null,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("vehicle-lookup error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
