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
      `https://rto-vehicle-information-verification-india.p.rapidapi.com/api/v1/rc/vehicleinfo`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-rapidapi-host": "rto-vehicle-information-verification-india.p.rapidapi.com",
          "x-rapidapi-key": RAPIDAPI_KEY,
        },
        body: JSON.stringify({ reg_no: plate_number, consent: "Y", consent_text: "I agree" }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("RapidAPI error:", response.status, errText);
      throw new Error(`Vehicle lookup failed: ${response.status}`);
    }

    const apiData = await response.json();
    const result = apiData.result || apiData;

    return new Response(JSON.stringify({
      success: true,
      mock: false,
      data: {
        plate_number,
        owner_name: result.owner_name || result.current_owner_name || "N/A",
        owner_phone: result.mobile_number || null,
        owner_address: result.permanent_address || result.present_address || "N/A",
        vehicle_type: result.vehicle_class_desc || "car",
        vehicle_make: result.maker_description || result.manufacturer || "N/A",
        vehicle_model: result.maker_model || result.model || "N/A",
        vehicle_color: result.color || "N/A",
        registration_date: result.registration_date || null,
        insurance_valid_until: result.insurance_upto || null,
        fitness_valid_until: result.fit_up_to || null,
        rto_office: result.rto_name || result.office_name || "N/A",
        state: result.state || plate_number.substring(0, 2),
        fuel_type: result.fuel_type || "N/A",
        engine_number: result.engine_number || "N/A",
        chassis_number: result.chassis_number || "N/A",
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
