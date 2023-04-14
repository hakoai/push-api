import { Dispatch, SetStateAction } from "react";
import { useMutation } from "react-query";
import { useLocalStorage } from "react-use";

const useUnregisterSubscriptionAll = (
  setEndpoint: Dispatch<SetStateAction<string | undefined>>
) => {
  return useMutation(async () => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/" });
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }
      registration.unregister();
      window.alert("登録解除しました");
    }
    setEndpoint("");
  });
};

const Home = () => {
  const [endpoint, setEndpoint] = useLocalStorage("endpoint", "");
  const { mutate: unregisterSubscriptionMutate } =
    useUnregisterSubscriptionAll(setEndpoint);

  return (
    <div className="container" style={{ padding: "50px 0 100px 0" }}>
      <div style={{ padding: "0 0 15px 0" }}>
        <button
          className="button block"
          onClick={() => unregisterSubscriptionMutate()}
        >
          すべての購読解除/Service Workers 削除
        </button>
      </div>
    </div>
  );
};

export default Home;
