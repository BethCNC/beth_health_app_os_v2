import type {
  DocumentRef,
  Encounter,
  LabResult,
  Medication,
  Patient,
  PatientContext,
  TimelineEvent,
} from "../domain/types";

const patient: Patient = {
  id: "patient-demo-001",
  displayName: "Morgan Ellis",
  preferredName: "Morgan",
  dob: "1987-04-22",
  sexAtBirth: "Female",
  bannerFlags: ["Fall risk", "No known drug allergies"],
};

const encounters: Encounter[] = [
  {
    id: "enc-001",
    patientId: patient.id,
    date: "2026-02-01",
    location: "West Clinic",
    reason: "Annual physical",
  },
];

const labs: LabResult[] = [
  {
    id: "lab-001",
    patientId: patient.id,
    collectedAt: "2026-02-02",
    name: "Hemoglobin A1c",
    value: "5.4",
    unit: "%",
    referenceRange: "4.0-5.6",
    status: "Normal",
  },
  {
    id: "lab-002",
    patientId: patient.id,
    collectedAt: "2026-02-02",
    name: "LDL Cholesterol",
    value: "118",
    unit: "mg/dL",
    referenceRange: "0-129",
    status: "Normal",
  },
];

const medications: Medication[] = [
  {
    id: "med-001",
    patientId: patient.id,
    name: "Lisinopril",
    dose: "10 mg",
    route: "PO",
    schedule: "Daily",
    status: "Active",
  },
];

const documents: DocumentRef[] = [
  {
    id: "doc-001",
    patientId: patient.id,
    title: "Annual Physical Note",
    type: "Note",
    createdAt: "2026-02-01",
    source: "Local",
  },
];

const timeline: TimelineEvent[] = [
  {
    id: "tl-001",
    patientId: patient.id,
    occurredAt: "2026-02-01",
    label: "Annual physical visit",
    sourceType: "Encounter",
    sourceId: encounters[0].id,
  },
  {
    id: "tl-002",
    patientId: patient.id,
    occurredAt: "2026-02-02",
    label: "Lab results posted",
    sourceType: "LabResult",
    sourceId: labs[0].id,
  },
];

export async function getPatientContext(): Promise<PatientContext> {
  return {
    patient,
    lastEncounter: encounters[0],
    activeMedications: medications.filter((med) => med.status === "Active").length,
    recentLabs: labs.length,
  };
}

export async function getPatientSummary(): Promise<{
  encounters: Encounter[];
  medications: Medication[];
  labs: LabResult[];
  documents: DocumentRef[];
}> {
  return {
    encounters,
    medications,
    labs,
    documents,
  };
}

export async function getPatientTimeline(): Promise<TimelineEvent[]> {
  return timeline;
}
