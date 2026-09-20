import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useOrganizationId() {
  const [organizationId, setOrganizationId] = useState("");

  useEffect(() => {
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", auth.user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      if (data) setOrganizationId(data.organization_id);
    })();
  }, []);

  return organizationId;
}
