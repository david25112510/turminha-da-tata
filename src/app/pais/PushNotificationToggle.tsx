"use client";

import { useEffect, useState } from "react";
import { subscribeToPush, unsubscribeFromPush } from "./push-actions";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

type Status = "unsupported" | "loading" | "subscribed" | "unsubscribed";

function isPushSupported() {
  if (typeof window === "undefined") return false;
  return "serviceWorker" in navigator && "PushManager" in window && Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY);
}

export function PushNotificationToggle() {
  const [status, setStatus] = useState<Status>(() => (isPushSupported() ? "loading" : "unsupported"));

  useEffect(() => {
    if (!isPushSupported()) return;

    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setStatus(subscription ? "subscribed" : "unsubscribed"))
      .catch(() => setStatus("unsupported"));
  }, []);

  async function handleSubscribe() {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) return;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    setStatus("loading");
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    await subscribeToPush(subscription.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } });
    setStatus("subscribed");
  }

  async function handleUnsubscribe() {
    setStatus("loading");
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await unsubscribeFromPush(subscription.endpoint);
      await subscription.unsubscribe();
    }
    setStatus("unsubscribed");
  }

  if (status === "unsupported" || status === "loading") return null;

  return (
    <button
      onClick={status === "subscribed" ? handleUnsubscribe : handleSubscribe}
      className="text-xs font-semibold text-[#1FA787] hover:underline"
    >
      {status === "subscribed" ? "Desativar notificações no dispositivo" : "Ativar notificações no dispositivo"}
    </button>
  );
}
