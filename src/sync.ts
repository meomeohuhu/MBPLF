import { Network } from "@capacitor/network";
import { addToHistory, getQueue, saveQueue } from "./storage";
import type { InspectionRecord } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export async function getOnlineStatus(): Promise<boolean> {
  try {
    const status = await Network.getStatus();
    return status.connected;
  } catch {
    return navigator.onLine;
  }
}

export async function submitInspection(record: InspectionRecord): Promise<InspectionRecord> {
  const online = await getOnlineStatus();

  if (!online) {
    throw new Error("Thi\u1ebft b\u1ecb \u0111ang ngo\u1ea1i tuy\u1ebfn");
  }

  const response = await fetch(`${API_BASE_URL}/api/inspections`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(record)
  });

  if (!response.ok) {
    throw new Error("Kh\u00f4ng th\u1ec3 \u0111\u1ed3ng b\u1ed9 v\u1edbi PostgreSQL");
  }

  return response.json();
}

export async function fetchServerInspections(): Promise<InspectionRecord[]> {
  const online = await getOnlineStatus();

  if (!online) {
    return [];
  }

  const response = await fetch(`${API_BASE_URL}/api/inspections`);

  if (!response.ok) {
    throw new Error("Kh\u00f4ng th\u1ec3 t\u1ea3i d\u1eef li\u1ec7u t\u1eeb PostgreSQL");
  }

  return response.json();
}

export async function syncPendingInspections(): Promise<InspectionRecord[]> {
  const records = await getQueue();
  const remaining: InspectionRecord[] = [];
  const synced: InspectionRecord[] = [];

  for (const record of records.reverse()) {
    try {
      const syncedRecord = await submitInspection(record);
      synced.push(syncedRecord);
      await addToHistory(syncedRecord);
    } catch {
      remaining.unshift({
        ...record,
        status: "FAILED",
        updatedAt: new Date().toISOString()
      });
    }
  }

  await saveQueue(remaining);
  return synced;
}

export async function registerBackgroundSync(): Promise<void> {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  const syncManager = "sync" in registration ? registration.sync : undefined;

  if (syncManager) {
    await syncManager.register("sync-inspections");
  }
}
