import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import { useSessionContext } from "@supabase/auth-helpers-react";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useMemo,
  useState,
} from "react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { useLocalStorage } from "react-use";

function encodeBase64URL(buffer: any) {
  return btoa(String.fromCharCode.apply(null, new Uint8Array(buffer) as any))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

const useProfiles = () => {
  const supabase = useSupabaseClient();
  return useQuery("profiles", async () => {
    const { data, error } = await supabase.from("profiles").select();
    if (error) {
      throw error;
    }
    return data;
  });
};

const useUnregisterSubscriptionAll = (
  setEndpoint: Dispatch<SetStateAction<string | undefined>>
) => {
  const user = useUser();
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation(async () => {
    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("user_id", user?.id);
    if (error) {
      throw error;
    }
    queryClient.invalidateQueries();
    setEndpoint("");

    if (!("serviceWorker" in navigator)) {
      return;
    }

    navigator.serviceWorker.register("/sw.js", { scope: "/" });
    const registration = await navigator.serviceWorker.ready;
    registration.unregister();
  });
};

const useRegisterSubscription = (
  setEndpoint: Dispatch<SetStateAction<string | undefined>>
) => {
  const user = useUser();
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation(async () => {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      window.alert(
        "通知が許可されませんでした。ブラウザの設定から通知を許可してください。"
      );
      throw "通知が許可されませんでした。ブラウザの設定から通知を許可してください。";
    }
    if (!("serviceWorker" in navigator)) {
      window.alert("このブラウザはサービスワーカーに対応していません。");
      throw "このブラウザはサービスワーカーに対応していません。";
    }

    navigator.serviceWorker.register("/sw.js", { scope: "/" });
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager
      .subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_PUSH_API_PUBLIC_KEY,
      })
      .catch((r) => {
        console.warn(r);
        window.alert(
          "サブスクライブ登録が失敗しました。ブラウザの対応状況/ブラウザの設定を確認してください。"
        );
        throw "サブスクライブ登録が失敗しました。ブラウザの対応状況/ブラウザの設定を確認してください。";
      });
    if (!subscription) {
      window.alert(
        "サブスクライブ登録が失敗しました。ブラウザの対応状況/ブラウザの設定を確認してください。"
      );
      throw "サブスクライブ登録が失敗しました。ブラウザの対応状況/ブラウザの設定を確認してください。";
    }

    const { error } = await supabase.from("profiles").insert([
      {
        user_id: user?.id,
        endpoint: subscription.endpoint,
        expiration_time: subscription.expirationTime,
        p256dh: encodeBase64URL(subscription.getKey("p256dh")),
        auth: encodeBase64URL(subscription.getKey("auth")),
      },
    ]);
    if (error) {
      console.warn(error);
      window.alert(
        "サブスクライブ登録が失敗しました。サーバの状況を確認してください。"
      );
      throw "サブスクライブ登録が失敗しました。サーバの状況を確認してください。";
    }
    setEndpoint(subscription.endpoint);
    queryClient.invalidateQueries();
  });
};

const useSend = () => {
  return useMutation(async (text: string) => {
    await fetch("api/send", { method: "POST", body: text });
  });
};

const Home = () => {
  const sessionContext = useSessionContext();
  const supabase = useSupabaseClient();
  const user = useUser();
  const { data: profiles, status: profilesStatus } = useProfiles();
  const [endpoint, setEndpoint] = useLocalStorage("endpoint", "");
  const {
    mutate: registerSubscriptionMutate,
    status: registerSubscriptionStatus,
  } = useRegisterSubscription(setEndpoint);
  const {
    mutate: unregisterSubscriptionMutate,
    status: unregisterSubscriptionStatus,
  } = useUnregisterSubscriptionAll(setEndpoint);
  const { mutate: sendMutate } = useSend();
  const [text, setText] = useState("");
  const isLoading =
    registerSubscriptionStatus === "loading" ||
    profilesStatus === "loading" ||
    unregisterSubscriptionStatus === "loading";

  const isSubscrived = profiles?.some(
    (profile) => profile.endpoint === endpoint
  );

  if (sessionContext.isLoading) {
    return (
      <div className="container" style={{ padding: "50px 0 100px 0" }}>
        Loading...
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: "50px 0 100px 0" }}>
      {!sessionContext.session || !user ? (
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={["github", "google"]}
          theme="dark"
          onlyThirdPartyProviders
        />
      ) : (
        <div className="form-widget">
          <div style={{ padding: "0 0 15px 0" }}>
            <button
              disabled={isLoading || isSubscrived}
              className="button block"
              onClick={() => registerSubscriptionMutate()}
            >
              {isSubscrived ? "購読中" : "購読開始"}
            </button>
          </div>
          <div style={{ padding: "0 0 15px 0" }}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="text"
              value={sessionContext.session.user.email}
              disabled
            />
          </div>
          <div style={{ padding: "0 0 15px 0" }}>
            {profiles?.map((profile) => {
              return (
                <div key={profile.id}>
                  <label htmlFor="email">Endpoint</label>
                  <input
                    type="text"
                    value={profile.endpoint.slice(0, 40) + "..."}
                    disabled
                  />
                </div>
              );
            })}
          </div>
          <div style={{ padding: "0 0 15px 0" }}>
            <button
              disabled={isLoading}
              className="button block"
              onClick={() => unregisterSubscriptionMutate()}
            >
              すべての購読解除/Service Workers 削除
            </button>
          </div>
          {user.email === "hakoai64@gmail.com" ? <div style={{ padding: "0 0 15px 0" }}>
            <label>SendText</label>
            <input
              id="Text"
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button
              className="button block"
              onClick={() => sendMutate(text)}
            >
              Push Message
            </button>
          </div> : null}
          <div>
            <button
              disabled={isLoading}
              className="button block"
              onClick={() => supabase.auth.signOut()}
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
