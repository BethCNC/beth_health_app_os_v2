import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirebaseEnv } from "@/lib/firebase/config";

export function getFirebaseClientApp(): FirebaseApp | null {
  const config = getFirebaseEnv();
  if (!config) {
    return null;
  }

  if (getApps().length > 0) {
    return getApp();
  }

  return initializeApp(config);
}
