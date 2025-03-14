import { type InsertVitals } from "@shared/schema";

// ESI vital signs danger zone thresholds
const DANGER_ZONE = {
  heartRate: { min: 50, max: 120 },
  respiratoryRate: { min: 12, max: 25 },
  oxygenSaturation: { min: 92 }, // Below this needs immediate attention
  temperature: { min: 36, max: 38.5 }, // Celsius
};

// Resource prediction based on chief complaints
const RESOURCE_INTENSIVE_COMPLAINTS = [
  "chest pain",
  "shortness of breath",
  "stroke",
  "severe bleeding",
  "trauma",
  "head injury",
];

export function calculateESILevel(
  chiefComplaint: string,
  vitals?: Partial<InsertVitals>,
): number {
  // Level 1: Immediate life-saving intervention
  if (isLevel1Condition(chiefComplaint, vitals)) {
    return 1;
  }

  // Level 2: High risk or severe pain/distress
  if (isLevel2Condition(chiefComplaint, vitals)) {
    return 2;
  }

  // Level 3-5: Based on resource needs
  return calculateResourceBasedLevel(chiefComplaint);
}

function isLevel1Condition(
  chiefComplaint: string,
  vitals?: Partial<InsertVitals>,
): boolean {
  const complaint = chiefComplaint.toLowerCase();
  
  // Immediate life threats
  const level1Conditions = [
    "cardiac arrest",
    "respiratory arrest",
    "not breathing",
    "no pulse",
    "unconscious",
    "severe trauma",
    "anaphylaxis",
  ];

  if (level1Conditions.some(condition => complaint.includes(condition))) {
    return true;
  }

  // Critical vital signs
  if (vitals) {
    if (
      (vitals.heartRate && vitals.heartRate > 150) ||
      (vitals.oxygenSaturation && vitals.oxygenSaturation < 85) ||
      (vitals.respiratoryRate && vitals.respiratoryRate > 35)
    ) {
      return true;
    }
  }

  return false;
}

function isLevel2Condition(
  chiefComplaint: string,
  vitals?: Partial<InsertVitals>,
): boolean {
  const complaint = chiefComplaint.toLowerCase();
  
  // High-risk situations
  const level2Conditions = [
    "chest pain",
    "stroke symptoms",
    "severe pain",
    "altered mental status",
    "overdose",
    "severe allergic reaction",
  ];

  if (level2Conditions.some(condition => complaint.includes(condition))) {
    return true;
  }

  // Concerning vital signs
  if (vitals) {
    if (
      (vitals.heartRate && (vitals.heartRate < DANGER_ZONE.heartRate.min || vitals.heartRate > DANGER_ZONE.heartRate.max)) ||
      (vitals.respiratoryRate && (vitals.respiratoryRate < DANGER_ZONE.respiratoryRate.min || vitals.respiratoryRate > DANGER_ZONE.respiratoryRate.max)) ||
      (vitals.oxygenSaturation && vitals.oxygenSaturation < DANGER_ZONE.oxygenSaturation.min)
    ) {
      return true;
    }
  }

  // Severe pain
  if (vitals?.painLevel && vitals.painLevel >= 8) {
    return true;
  }

  return false;
}

function calculateResourceBasedLevel(chiefComplaint: string): number {
  const complaint = chiefComplaint.toLowerCase();
  
  // Count expected resources needed
  let resourceCount = 0;

  // Lab work likely needed
  if (complaint.includes("fever") || 
      complaint.includes("infection") || 
      complaint.includes("pain")) {
    resourceCount++;
  }

  // Imaging likely needed
  if (complaint.includes("injury") || 
      complaint.includes("fall") || 
      complaint.includes("pain")) {
    resourceCount++;
  }

  // IV/Medication likely needed
  if (complaint.includes("dehydration") || 
      complaint.includes("vomiting") || 
      complaint.includes("severe pain")) {
    resourceCount++;
  }

  // Specialist consultation likely needed
  if (RESOURCE_INTENSIVE_COMPLAINTS.some(term => complaint.includes(term))) {
    resourceCount += 2;
  }

  // Assign level based on resource count
  if (resourceCount > 2) return 3;
  if (resourceCount > 0) return 4;
  return 5;
}
