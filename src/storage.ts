import localforage from "localforage";
import { emptyDraft, type InspectionDraft, type InspectionRecord } from "./types";

const draftStore = localforage.createInstance({
  name: "vku_inspect",
  storeName: "inspection_draft"
});

const queueStore = localforage.createInstance({
  name: "vku_inspect",
  storeName: "inspection_queue"
});

const historyStore = localforage.createInstance({
  name: "vku_inspect",
  storeName: "inspection_history"
});

export async function getDraft(): Promise<InspectionDraft> {
  return { ...emptyDraft, ...((await draftStore.getItem<InspectionDraft>("current")) ?? {}) };
}

export async function saveDraft(draft: InspectionDraft): Promise<void> {
  await draftStore.setItem("current", draft);
}

export async function clearDraft(): Promise<void> {
  await draftStore.removeItem("current");
}

export async function getQueue(): Promise<InspectionRecord[]> {
  return ((await queueStore.getItem<InspectionRecord[]>("records")) ?? []).map((record) => ({
    ...record,
    evaluatorName: record.evaluatorName ?? "Chưa cập nhật"
  }));
}

export async function saveQueue(records: InspectionRecord[]): Promise<void> {
  await queueStore.setItem("records", records);
}

export async function enqueueInspection(record: InspectionRecord): Promise<void> {
  const records = await getQueue();
  await saveQueue([record, ...records]);
}

export async function updateQueuedInspection(record: InspectionRecord): Promise<void> {
  const records = await getQueue();
  await saveQueue(records.map((item) => (item.id === record.id ? record : item)));
}

export async function getHistory(): Promise<InspectionRecord[]> {
  return ((await historyStore.getItem<InspectionRecord[]>("records")) ?? []).map((record) => ({
    ...record,
    evaluatorName: record.evaluatorName ?? "Chưa cập nhật"
  }));
}

export async function saveHistory(records: InspectionRecord[]): Promise<void> {
  await historyStore.setItem("records", records);
}

export async function addToHistory(record: InspectionRecord): Promise<void> {
  const records = await getHistory();
  await saveHistory([record, ...records]);
}
