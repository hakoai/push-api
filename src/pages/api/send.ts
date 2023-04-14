import { NextApiHandler } from "next";
import { createServerSupabaseClient } from "@supabase/auth-helpers-nextjs";
import * as WebPush from "web-push";
import { createClient } from "@supabase/supabase-js";

const ProtectedRoute: NextApiHandler = async (req, res) => {
  const supabase = createServerSupabaseClient({ req, res });
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE || ""
  );

  if (!session || session.user.email !== "hakoai64@gmail.com")
    return res.status(401).json({
      error: "not_authenticated",
      description:
        "The user does not have an active session or is not authenticated",
    });

  const { data, error } = await supabaseAdmin.from("profiles").select();

  if (error) {
    console.error(error);
    return res.status(500).json({
      error: "query error",
    });
  }

  if (data) {
    WebPush.setVapidDetails(
      "mailto:hakoai64@gmail.com",
      process.env.NEXT_PUBLIC_PUSH_API_PUBLIC_KEY || "",
      process.env.PUSH_API_PRIVATE_KEY || ""
    );
    for (const params of data) {
      try {
        const result = await WebPush.sendNotification(
          {
            endpoint: params.endpoint,
            keys: {
              p256dh: params.p256dh,
              auth: params.auth,
            },
          },
          JSON.stringify({ title: req.body }),
          {
            headers: {
              Urgency: "normal",
            },
          }
        );
        console.log(result);
      } catch (e) {
        console.warn(e);
      }
    }
  }
  res.json({ ok: true });
};

export default ProtectedRoute;
