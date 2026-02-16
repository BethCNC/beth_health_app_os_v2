export type Patient = {
  id: string;
  displayName: string;
  dob: string;
  sexAtBirth: "Female" | "Male" | "Other" | "Unknown";
  preferredName?: string;
  bannerFlags: string[];
};

export type Encounter = {
  id: string;
  patientId: string;
  date: string;
  location: string;
  reason: string;
};

export type LabResult = {
  id: string;
  patientId: string;
  collectedAt: string;
  name: string;
  value: string;
  unit: string;
  referenceRange: string;
  status: "Normal" | "High" | "Low" | "Abnormal";
};

export type Medication = {
  id: string;
  patientId: string;
  name: string;
  dose: string;
  route: string;
  schedule: string;
  status: "Active" | "Stopped";
};

export type DocumentRef = {
  id: string;
  patientId: string;
  title: string;
  type: "Note" | "Image" | "Report";
  createdAt: string;
  source: "Local" | "External";
};

export type TimelineEvent = {
  id: string;
  patientId: string;
  occurredAt: string;
  label: string;
  sourceType: "Encounter" | "LabResult" | "Medication" | "Document";
  sourceId: string;
};

export type PatientContext = {
  patient: Patient;
  lastEncounter?: Encounter;
  activeMedications: number;
  recentLabs: number;
};
