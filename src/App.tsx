import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Camera,
  CheckCircle2,
  CloudOff,
  Cloudy,
  ClipboardCheck,
  Eye,
  FileText,
  Filter,
  History,
  Loader2,
  RefreshCw,
  Send,
  Star,
  Trash2,
  Wifi
} from "lucide-react";
import { Network } from "@capacitor/network";
import { captureInspectionPhoto } from "./camera";
import {
  addToHistory,
  clearDraft,
  enqueueInspection,
  getDraft,
  getHistory,
  getQueue,
  saveDraft,
  saveQueue
} from "./storage";
import { fetchServerInspections, getOnlineStatus, registerBackgroundSync, submitInspection, syncPendingInspections } from "./sync";
import { categories, emptyDraft, type InspectionDraft, type InspectionRecord, type Rating } from "./types";

const steps = ["Vị trí", "Hạng mục", "Tình trạng", "Xác nhận"] as const;
const statusFilters = ["ALL", "PENDING_SYNC", "SYNCED", "FAILED"] as const;

type ViewMode = "inspect" | "dashboard";
type StatusFilter = (typeof statusFilters)[number];

function statusLabel(status: StatusFilter | InspectionRecord["status"]) {
  return {
    ALL: "Tất cả trạng thái",
    DRAFT: "Bản nháp",
    PENDING_SYNC: "Chờ đồng bộ",
    SYNCED: "Đã đồng bộ",
    FAILED: "Lỗi đồng bộ"
  }[status];
}

function createRecord(draft: InspectionDraft): InspectionRecord {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    status: "PENDING_SYNC",
    ...draft
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>("inspect");
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<InspectionDraft>(emptyDraft);
  const [queue, setQueueState] = useState<InspectionRecord[]>([]);
  const [history, setHistoryState] = useState<InspectionRecord[]>([]);
  const [serverRecords, setServerRecords] = useState<InspectionRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<"ALL" | InspectionRecord["category"]>("ALL");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isReady, setIsReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState("Bản nháp đang được lưu tự động.");

  const canProceed = useMemo(() => {
    if (step === 0) {
      return draft.building.trim() && draft.floor.trim() && draft.roomNumber.trim() && draft.evaluatorName.trim();
    }

    if (step === 2) {
      return draft.defectNotes.trim().length >= 3;
    }

    return true;
  }, [draft, step]);

  const allRecords = useMemo(
    () => {
      const recordsById = new Map<string, InspectionRecord>();

      for (const record of [...serverRecords, ...history, ...queue]) {
        recordsById.set(record.id, record);
      }

      return [...recordsById.values()].sort((first, second) => Date.parse(second.updatedAt) - Date.parse(first.updatedAt));
    },
    [history, queue, serverRecords]
  );

  const filteredRecords = useMemo(() => {
    return allRecords.filter((record) => {
      const matchesStatus = statusFilter === "ALL" || record.status === statusFilter;
      const matchesCategory = categoryFilter === "ALL" || record.category === categoryFilter;
      return matchesStatus && matchesCategory;
    });
  }, [allRecords, categoryFilter, statusFilter]);

  const selectedRecord = useMemo(() => {
    return allRecords.find((record) => record.id === selectedRecordId) ?? filteredRecords[0] ?? null;
  }, [allRecords, filteredRecords, selectedRecordId]);

  const averageRating = useMemo(() => {
    if (!allRecords.length) {
      return "0.0";
    }

    const total = allRecords.reduce((sum, record) => sum + record.rating, 0);
    return (total / allRecords.length).toFixed(1);
  }, [allRecords]);

  const refreshLists = async () => {
    const [queuedRecords, historyRecords] = await Promise.all([getQueue(), getHistory()]);
    setQueueState(queuedRecords);
    setHistoryState(historyRecords);

    try {
      const remoteRecords = await fetchServerInspections();
      setServerRecords(remoteRecords);
    } catch {
      setMessage("Chưa kết nối được PostgreSQL, đang dùng dữ liệu local.");
    }
  };

  const runSync = async () => {
    if (isSyncing) {
      return;
    }

    setIsSyncing(true);
    try {
      const synced = await syncPendingInspections();
      await refreshLists();
      setMessage(synced.length ? `Đã đồng bộ ${synced.length} phiếu kiểm tra.` : "Không có phiếu nào cần đồng bộ.");
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    let unsubscribeNetwork: { remove: () => Promise<void> } | undefined;

    async function boot() {
      const [storedDraft, queuedRecords, historyRecords, online] = await Promise.all([
        getDraft(),
        getQueue(),
        getHistory(),
        getOnlineStatus()
      ]);

      setDraft(storedDraft);
      setQueueState(queuedRecords);
      setHistoryState(historyRecords);
      setIsOnline(online);
      setIsReady(true);

      if (online) {
        fetchServerInspections()
          .then((remoteRecords) => setServerRecords(remoteRecords))
          .catch(() => setMessage("Chưa kết nối được PostgreSQL, đang dùng dữ liệu local."));
      }

      if (online && queuedRecords.length) {
        runSync();
      }
    }

    boot();

    const handleOnline = () => {
      setIsOnline(true);
      runSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setMessage("Đã bật chế độ ngoại tuyến. Phiếu gửi sẽ nằm trong hàng chờ.");
    };
    const handleWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === "SYNC_INSPECTIONS") {
        runSync();
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    navigator.serviceWorker?.addEventListener("message", handleWorkerMessage);
    Network.addListener("networkStatusChange", (status) => {
      setIsOnline(status.connected);
      if (status.connected) {
        runSync();
      }
    }).then((listener) => {
      unsubscribeNetwork = listener;
    });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      navigator.serviceWorker?.removeEventListener("message", handleWorkerMessage);
      unsubscribeNetwork?.remove();
    };
  }, []);

  useEffect(() => {
    if (isReady) {
      saveDraft(draft).catch(() => undefined);
    }
  }, [draft, isReady]);

  const updateDraft = <K extends keyof InspectionDraft>(key: K, value: InspectionDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const submit = async () => {
    const record = createRecord(draft);

    try {
      const syncedRecord = await submitInspection(record);
      await addToHistory(syncedRecord);
      setMessage("Phiếu kiểm tra đã gửi và đồng bộ.");
    } catch {
      await enqueueInspection(record);
      await registerBackgroundSync().catch(() => undefined);
      setMessage("Phiếu kiểm tra đã được lưu vào hàng chờ ngoại tuyến.");
    }

    await clearDraft();
    setDraft(emptyDraft);
    setStep(0);
    await refreshLists();
  };

  const clearQueued = async () => {
    await saveQueue([]);
    await refreshLists();
    setMessage("Đã xóa hàng chờ.");
  };

  if (!isReady) {
    return (
      <main className="loading-screen">
        <Loader2 className="spin" size={36} />
        <span>Đang tải không gian làm việc ngoại tuyến</span>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <img src="/logo.png" alt="Logo VKU Kiểm Kê" />
          <div>
            <span>VKU Kiểm Kê</span>
            <strong>Bảng kiểm tra cơ sở vật chất</strong>
          </div>
        </div>
        <div className={isOnline ? "status online" : "status offline"}>
          {isOnline ? <Wifi size={18} /> : <CloudOff size={18} />}
          <span>{isOnline ? "Trực tuyến" : "Ngoại tuyến"}</span>
        </div>
      </header>

      <nav className="view-tabs" aria-label="Các màn hình chính">
        <button className={viewMode === "inspect" ? "active" : ""} onClick={() => setViewMode("inspect")} type="button">
          <ClipboardCheck size={18} />
          Tạo phiếu kiểm tra
        </button>
        <button className={viewMode === "dashboard" ? "active" : ""} onClick={() => setViewMode("dashboard")} type="button">
          <FileText size={18} />
          Bảng đánh giá
        </button>
      </nav>

      <section className="summary-band">
        <div>
          <ClipboardCheck size={22} />
          <span>Lưu nháp tự động</span>
          <strong>IndexedDB</strong>
        </div>
        <div>
          <Cloudy size={22} />
          <span>Chờ đồng bộ</span>
          <strong>{queue.length}</strong>
        </div>
        <div>
          <Star size={22} />
          <span>Điểm trung bình</span>
          <strong>{averageRating}</strong>
        </div>
        <div>
          <History size={22} />
          <span>Lịch sử</span>
          <strong>{history.length}</strong>
        </div>
      </section>

      {viewMode === "dashboard" ? (
        <section className="dashboard">
          <div className="dashboard-toolbar">
            <div>
              <span>Bảng đánh giá kiểm tra</span>
              <strong>{filteredRecords.length} phiếu đang hiển thị</strong>
            </div>
            <div className="filters" aria-label="Bộ lọc dashboard">
              <Filter size={18} />
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
                {statusFilters.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel(status)}
                  </option>
                ))}
              </select>
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value as "ALL" | InspectionRecord["category"])}
              >
                <option value="ALL">Tất cả hạng mục</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="dashboard-grid">
            <div className="dashboard-list">
              {filteredRecords.length === 0 ? (
                <div className="empty-state">
                  <ClipboardCheck size={26} />
                  <span>Không có phiếu kiểm tra phù hợp bộ lọc</span>
                </div>
              ) : (
                filteredRecords.map((record) => (
                  <button
                    className={selectedRecord?.id === record.id ? "dashboard-row active" : "dashboard-row"}
                    key={record.id}
                    onClick={() => setSelectedRecordId(record.id)}
                    type="button"
                  >
                    <div>
                      <strong>{record.roomNumber}</strong>
                      <span>
                        {record.building} - Tầng {record.floor}
                      </span>
                    </div>
                    <div>
                      <span>{record.category}</span>
                      <strong>{record.rating}/5</strong>
                    </div>
                    <span className={`pill ${record.status.toLowerCase()}`}>{statusLabel(record.status)}</span>
                  </button>
                ))
              )}
            </div>

            <aside className="detail-panel">
              {selectedRecord ? (
                <>
                  <div className="detail-heading">
                    <div>
                      <span>{selectedRecord.category}</span>
                      <strong>{selectedRecord.roomNumber}</strong>
                    </div>
                    <span className={`pill ${selectedRecord.status.toLowerCase()}`}>{statusLabel(selectedRecord.status)}</span>
                  </div>
                  <div className="detail-photo">
                    {selectedRecord.photoUri ? (
                      <img src={selectedRecord.photoUri} alt="Ảnh minh chứng kiểm tra" />
                    ) : (
                      <div>
                        <Eye size={24} />
                        <span>Chưa có ảnh đính kèm</span>
                      </div>
                    )}
                  </div>
                  <div className="detail-stats">
                    <span>Tòa nhà</span>
                    <strong>{selectedRecord.building}</strong>
                    <span>Người đánh giá</span>
                    <strong>{selectedRecord.evaluatorName}</strong>
                    <span>Tầng</span>
                    <strong>{selectedRecord.floor}</strong>
                    <span>Đánh giá</span>
                    <strong>{selectedRecord.rating}/5</strong>
                    <span>Ngày tạo</span>
                    <strong>{formatDate(selectedRecord.createdAt)}</strong>
                    <span>Cập nhật</span>
                    <strong>{formatDate(selectedRecord.updatedAt)}</strong>
                    <span>Mã phiếu</span>
                    <strong>{selectedRecord.id.slice(0, 8)}</strong>
                  </div>
                  <div className="notes-box">
                    <span>Ghi chú lỗi</span>
                    <p>{selectedRecord.defectNotes}</p>
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  <Eye size={26} />
                  <span>Chọn một phiếu để xem chi tiết</span>
                </div>
              )}
            </aside>
          </div>
        </section>
      ) : (
        <section className="workspace">
          <form className="inspection-panel" onSubmit={(event) => event.preventDefault()}>
            <div className="stepper" aria-label="Các bước kiểm tra">
              {steps.map((label, index) => (
                <button
                  className={index === step ? "step active" : index < step ? "step done" : "step"}
                  key={label}
                  onClick={() => setStep(index)}
                  type="button"
                >
                  <span>{index + 1}</span>
                  {label}
                </button>
              ))}
            </div>

            {step === 0 && (
              <div className="form-page">
                <h1>Vị trí</h1>
                <label>
                  Tòa nhà
                  <input value={draft.building} onChange={(event) => updateDraft("building", event.target.value)} placeholder="VD: B1" />
                </label>
                <label>
                  Tầng
                  <input value={draft.floor} onChange={(event) => updateDraft("floor", event.target.value)} placeholder="VD: Tầng hầm" />
                </label>
                <label>
                  Số phòng
                  <input value={draft.roomNumber} onChange={(event) => updateDraft("roomNumber", event.target.value)} placeholder="VD: B1-103" />
                </label>
                <label>
                  Người đánh giá
                  <input value={draft.evaluatorName} onChange={(event) => updateDraft("evaluatorName", event.target.value)} placeholder="VD: Nguyễn Văn A" />
                </label>
              </div>
            )}

            {step === 1 && (
              <div className="form-page">
                <h1>Hạng mục</h1>
                <div className="category-grid">
                  {categories.map((category) => (
                    <button
                      className={draft.category === category ? "category active" : "category"}
                      key={category}
                      onClick={() => updateDraft("category", category)}
                      type="button"
                    >
                      <Building2 size={20} />
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="form-page">
                <h1>Tình trạng</h1>
                <div className="rating" aria-label="Đánh giá tình trạng">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      aria-label={`${rating} sao`}
                      className={rating <= draft.rating ? "star active" : "star"}
                      key={rating}
                      onClick={() => updateDraft("rating", rating as Rating)}
                      type="button"
                    >
                      <Star fill="currentColor" size={28} />
                    </button>
                  ))}
                </div>
                <label>
                  Ghi chú lỗi
                  <textarea
                    value={draft.defectNotes}
                    onChange={(event) => updateDraft("defectNotes", event.target.value)}
                    placeholder="Mô tả lỗi, vị trí hư hỏng, mức độ nghiêm trọng hoặc nhu cầu thay thế."
                    rows={6}
                  />
                </label>
              </div>
            )}

            {step === 3 && (
              <div className="form-page">
                <h1>Xác nhận</h1>
                <div className="review-grid">
                  <span>Người đánh giá</span>
                  <strong>{draft.evaluatorName || "Chưa nhập"}</strong>
                  <span>Tòa nhà</span>
                  <strong>{draft.building || "Chưa nhập"}</strong>
                  <span>Tầng / Phòng</span>
                  <strong>
                    {draft.floor || "Chưa nhập"} / {draft.roomNumber || "Chưa nhập"}
                  </strong>
                  <span>Hạng mục</span>
                  <strong>{draft.category}</strong>
                  <span>Đánh giá</span>
                  <strong>{draft.rating}/5</strong>
                </div>
                {draft.photoUri ? (
                  <img className="photo-preview" src={draft.photoUri} alt="Ảnh minh chứng kiểm tra" />
                ) : (
                  <div className="photo-empty">Chưa có ảnh đính kèm</div>
                )}
                <button
                  className="secondary-action"
                  onClick={async () => {
                    const photoUri = await captureInspectionPhoto();
                    if (photoUri) {
                      updateDraft("photoUri", photoUri);
                    }
                  }}
                  type="button"
                >
                  <Camera size={18} />
                  Chụp ảnh
                </button>
              </div>
            )}

            <div className="form-actions">
              <button disabled={step === 0} onClick={() => setStep((current) => current - 1)} type="button">
                Quay lại
              </button>
              {step < steps.length - 1 ? (
                <button disabled={!canProceed} onClick={() => setStep((current) => current + 1)} type="button">
                  Tiếp tục
                </button>
              ) : (
                <button disabled={!canProceed} onClick={submit} type="button">
                  <Send size={18} />
                  Gửi phiếu
                </button>
              )}
            </div>
          </form>

          <aside className="queue-panel">
            <div className="panel-heading">
              <div>
                <span>{message}</span>
                <strong>Hàng chờ ngoại tuyến</strong>
              </div>
              <button aria-label="Đồng bộ ngay" className="icon-button" disabled={isSyncing} onClick={runSync} type="button">
                {isSyncing ? <Loader2 className="spin" size={18} /> : <RefreshCw size={18} />}
              </button>
            </div>

            <div className="record-list">
              {queue.length === 0 ? (
                <div className="empty-state">
                  <CheckCircle2 size={26} />
                  <span>Không có phiếu chờ đồng bộ</span>
                </div>
              ) : (
                queue.map((record) => (
                  <article className="record-card" key={record.id}>
                    <div>
                      <strong>{record.roomNumber}</strong>
                      <span>
                        {record.category} - {formatDate(record.createdAt)}
                      </span>
                    </div>
                    <span className={`pill ${record.status.toLowerCase()}`}>{statusLabel(record.status)}</span>
                  </article>
                ))
              )}
            </div>

            <button className="danger-action" disabled={!queue.length} onClick={clearQueued} type="button">
              <Trash2 size={18} />
              Xóa hàng chờ
            </button>

            <div className="history-list">
              <strong>Phiếu đã đồng bộ gần đây</strong>
              {history.slice(0, 4).map((record) => (
                <span key={record.id}>
                  {record.roomNumber} - {record.category} - {formatDate(record.updatedAt)}
                </span>
              ))}
              {!history.length && <span>Chưa có phiếu nào được đồng bộ</span>}
            </div>
          </aside>
        </section>
      )}
    </main>
  );
}
