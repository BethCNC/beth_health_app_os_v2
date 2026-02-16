import type { LabResult, Medication, PatientContext } from "../domain/types";

type ProblemItem = {
  id: string;
  problem: string;
  status: "Active" | "Resolved" | "Monitoring";
  onset: string;
  lastReviewed: string;
};

type AllergyItem = {
  id: string;
  agent: string;
  reaction: string;
  severity: "Mild" | "Moderate" | "Severe";
};

type HealthMaintenanceItem = {
  id: string;
  topic: string;
  status: "Due" | "Overdue" | "Completed";
  due: string;
};

const patientContext: PatientContext = {
  patient: {
    id: "pt-0001",
    displayName: "Test Patient 001",
    dob: "1980-01-14",
    sexAtBirth: "Female",
    preferredName: "Casey",
    bannerFlags: ["Fall risk", "Care gaps pending"],
  },
  lastEncounter: {
    id: "enc-1001",
    patientId: "pt-0001",
    date: "02/01/2026",
    location: "Primary Care Clinic",
    reason: "Annual wellness visit",
  },
  activeMedications: 3,
  recentLabs: 4,
};

const problemList: ProblemItem[] = [
  {
    id: "prob-1",
    problem: "Hypertension",
    status: "Active",
    onset: "2018",
    lastReviewed: "01/18/2026",
  },
  {
    id: "prob-2",
    problem: "Type 2 diabetes",
    status: "Monitoring",
    onset: "2020",
    lastReviewed: "12/30/2025",
  },
  {
    id: "prob-3",
    problem: "Hyperlipidemia",
    status: "Active",
    onset: "2019",
    lastReviewed: "02/01/2026",
  },
  {
    id: "prob-4",
    problem: "Seasonal allergic rhinitis",
    status: "Resolved",
    onset: "2016",
    lastReviewed: "09/08/2025",
  },
];

const allergies: AllergyItem[] = [
  {
    id: "alg-1",
    agent: "Penicillin",
    reaction: "Rash",
    severity: "Moderate",
  },
  {
    id: "alg-2",
    agent: "Latex",
    reaction: "Contact dermatitis",
    severity: "Mild",
  },
  {
    id: "alg-3",
    agent: "Shellfish",
    reaction: "Swelling",
    severity: "Severe",
  },
];

const activeMeds: Medication[] = [
  {
    id: "med-1",
    patientId: "pt-0001",
    name: "Lisinopril",
    dose: "10 mg",
    route: "PO",
    schedule: "Daily",
    status: "Active",
  },
  {
    id: "med-2",
    patientId: "pt-0001",
    name: "Metformin",
    dose: "500 mg",
    route: "PO",
    schedule: "BID with meals",
    status: "Active",
  },
  {
    id: "med-3",
    patientId: "pt-0001",
    name: "Atorvastatin",
    dose: "20 mg",
    route: "PO",
    schedule: "Nightly",
    status: "Active",
  },
];

const recentLabs: LabResult[] = [
  {
    id: "lab-1",
    patientId: "pt-0001",
    collectedAt: "01/18/2026",
    name: "HbA1c",
    value: "7.4",
    unit: "%",
    referenceRange: "4.0-5.6",
    status: "High",
  },
  {
    id: "lab-2",
    patientId: "pt-0001",
    collectedAt: "01/18/2026",
    name: "LDL",
    value: "112",
    unit: "mg/dL",
    referenceRange: "<100",
    status: "High",
  },
  {
    id: "lab-3",
    patientId: "pt-0001",
    collectedAt: "01/18/2026",
    name: "Creatinine",
    value: "0.9",
    unit: "mg/dL",
    referenceRange: "0.6-1.1",
    status: "Normal",
  },
  {
    id: "lab-4",
    patientId: "pt-0001",
    collectedAt: "01/18/2026",
    name: "Potassium",
    value: "3.4",
    unit: "mmol/L",
    referenceRange: "3.6-5.1",
    status: "Low",
  },
];

const healthMaintenance: HealthMaintenanceItem[] = [
  {
    id: "hm-1",
    topic: "Diabetic eye exam",
    status: "Overdue",
    due: "12/15/2025",
  },
  {
    id: "hm-2",
    topic: "Foot exam",
    status: "Due",
    due: "03/01/2026",
  },
  {
    id: "hm-3",
    topic: "Flu vaccine",
    status: "Completed",
    due: "10/10/2025",
  },
  {
    id: "hm-4",
    topic: "Lipid panel",
    status: "Due",
    due: "03/15/2026",
  },
];

export function getPatientContext(): PatientContext {
  return patientContext;
}

export function getProblemList(): ProblemItem[] {
  return problemList;
}

export function getAllergies(): AllergyItem[] {
  return allergies;
}

export function getActiveMeds(): Medication[] {
  return activeMeds;
}

export function getRecentLabs(): LabResult[] {
  return recentLabs;
}

export function getHealthMaintenance(): HealthMaintenanceItem[] {
  return healthMaintenance;
}
