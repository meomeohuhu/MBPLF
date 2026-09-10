export const categories = ["Phần cứng", "Máy chiếu", "Điều hòa", "Điện", "Nội thất"] as const;

export type InspectionCategory = (typeof categories)[number];
export type Rating = 1 | 2 | 3 | 4 | 5;
export type InspectionStatus = "DRAFT" | "PENDING_SYNC" | "SYNCED" | "FAILED";

export interface InspectionRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  building: string;
  floor: string;
  roomNumber: string;
  evaluatorName: string;
  category: InspectionCategory;
  rating: Rating;
  defectNotes: string;
  photoUri: string | null;
  status: InspectionStatus;
}

export type InspectionDraft = Omit<InspectionRecord, "id" | "createdAt" | "updatedAt" | "status">;

export const emptyDraft: InspectionDraft = {
  building: "",
  floor: "",
  roomNumber: "",
  evaluatorName: "",
  category: "Phần cứng",
  rating: 3,
  defectNotes: "",
  photoUri: null
};
