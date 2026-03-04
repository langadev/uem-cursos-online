import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5.2.4";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const firebaseProjectId = Deno.env.get("FIREBASE_PROJECT_ID") ?? "";

const jwks = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
  ),
);

async function verifyFirebaseIdToken(idToken: string) {
  if (!firebaseProjectId) throw new Error("Missing FIREBASE_PROJECT_ID");
  const { payload } = await jwtVerify(idToken, jwks, {
    audience: firebaseProjectId,
    issuer: `https://securetoken.google.com/${firebaseProjectId}`,
  });
  const uid = payload.sub;
  if (!uid) throw new Error("Token missing sub");
  return {
    uid: String(uid),
    email: typeof payload.email === "string" ? payload.email : null,
  };
}

Deno.serve(async (req: Request) => {
  try {
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({
          error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const authHeader = req.headers.get("Authorization") || "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const { uid, email } = await verifyFirebaseIdToken(match[1]);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    if (req.method === "POST" || req.method === "PUT") {
      const body = (await req.json().catch(() => ({}))) as any;

      const payload = {
        id: uid,
        uid,
        email: body.email ?? email ?? "",
        full_name: body.full_name ?? email?.split("@")[0] ?? "Utilizador",
        role: body.role ?? "student",
        status: body.status ?? "Ativo",
        avatar_url: body.avatar_url ?? null,
        last_sync: new Date().toISOString(),
      };

      const { data, error } = await admin
        .from("profiles")
        .upsert(payload, { onConflict: "id" })
        .select(
          "id, uid, email, full_name, avatar_url, role, status, created_at, updated_at",
        )
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ profile: data }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data, error } = await admin
      .from("profiles")
      .select(
        "id, uid, email, full_name, avatar_url, role, status, created_at, updated_at",
      )
      .eq("id", uid)
      .maybeSingle();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ profile: data ?? null }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});
