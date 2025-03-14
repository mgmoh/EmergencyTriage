import { type InsertVitals } from "@shared/schema";

// ESI vital signs danger zone thresholds
const DANGER_ZONE = {
  heartRate: { min: 50, max: 120 },
  respiratoryRate: { min: 12, max: 25 },
  oxygenSaturation: { min: 92 }, // Below this needs immediate attention
  temperature: { min: 36, max: 38.5 }, // Celsius
};

// High-risk conditions from medical history
const HIGH_RISK_CONDITIONS = [
  "diabetes",
  "hypertension",
  "heart disease",
  "copd",
  "asthma",
  "immunocompromised",
  "cancer",
  "stroke",
];

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
  fhirPatient?: any
): number {
  const complaint = chiefComplaint.toLowerCase();
  console.log('Calculating ESI level for complaint:', complaint);
  console.log('Patient history:', fhirPatient?.conditions);

  // Check medical history for high-risk conditions
  const hasHighRiskHistory = checkHighRiskHistory(fhirPatient);
  console.log('Has high-risk history:', hasHighRiskHistory);

  // Level 1: Immediate life-saving intervention
  if (isLevel1Condition(chiefComplaint, vitals)) {
    console.log('Level 1: Immediate life-saving intervention needed');
    return 1;
  }

  // Check if the complaint matches any severe conditions in history
  if (fhirPatient?.conditions) {
    const relatedConditions = fhirPatient.conditions.filter((condition: any) => {
      const conditionText = condition?.code?.text?.toLowerCase() || '';
      const isRelated = complaint.includes(conditionText) || conditionText.includes(complaint);
      if (isRelated) {
        console.log('Found related condition:', condition);
      }
      return isRelated;
    });

    // If there's a matching condition marked as severe, escalate to level 2
    const hasSevereRelatedCondition = relatedConditions.some(
      (condition: any) => condition.severity?.toLowerCase() === 'severe'
    );

    if (hasSevereRelatedCondition) {
      console.log('Level 2: Severe related condition in history');
      return 2;
    }
  }

  // Level 2: High risk or severe pain/distress
  if (isLevel2Condition(chiefComplaint, vitals, hasHighRiskHistory)) {
    console.log('Level 2: High risk or severe pain/distress');
    return 2;
  }

  // Level 3-5: Based on resource needs and medical history
  const finalLevel = calculateResourceBasedLevel(chiefComplaint, hasHighRiskHistory);
  console.log('Final ESI Level:', finalLevel);
  return finalLevel;
}

function checkHighRiskHistory(fhirPatient?: any): boolean {
  if (!fhirPatient?.conditions) {
    return false;
  }

  // Check if patient has any high-risk conditions in their history
  const conditions = fhirPatient.conditions.map((condition: any) => ({
    text: condition?.code?.text?.toLowerCase() || '',
    code: condition?.code?.coding?.[0]?.code?.toLowerCase() || '',
    severity: condition?.severity?.toLowerCase() || ''
  }));

  // Check for severe conditions
  const hasSevereCondition = conditions.some(c => c.severity === 'severe');
  if (hasSevereCondition) {
    console.log('Found severe condition in history');
    return true;
  }

  // Check for chronic conditions that match our high-risk list
  const hasHighRiskCondition = conditions.some(condition => 
    HIGH_RISK_CONDITIONS.some(risk => 
      condition.text.includes(risk.toLowerCase()) || 
      condition.code.includes(risk.toLowerCase())
    )
  );

  if (hasHighRiskCondition) {
    console.log('Found high-risk condition in history');
  }

  return hasHighRiskCondition;
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
  hasHighRiskHistory: boolean = false,
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

function calculateResourceBasedLevel(
  chiefComplaint: string,
  hasHighRiskHistory: boolean
): number {
  const complaint = chiefComplaint.toLowerCase();

  // Count expected resources needed
  let resourceCount = 0;

  // Lab work likely needed
  if (complaint.includes("fever") || 
      complaint.includes("infection") || 
      complaint.includes("pain")) {
    resourceCount++;
    console.log('Added resource for lab work');
  }

  // Imaging likely needed
  if (complaint.includes("injury") || 
      complaint.includes("fall") || 
      complaint.includes("pain")) {
    resourceCount++;
    console.log('Added resource for imaging');
  }

  // IV/Medication likely needed
  if (complaint.includes("dehydration") || 
      complaint.includes("vomiting") || 
      complaint.includes("severe pain")) {
    resourceCount++;
    console.log('Added resource for IV/Medication');
  }

  // Specialist consultation likely needed
  if (RESOURCE_INTENSIVE_COMPLAINTS.some(term => complaint.includes(term))) {
    resourceCount += 2;
    console.log('Added resources for specialist consultation');
  }

  // High-risk history increases resource needs
  if (hasHighRiskHistory) {
    resourceCount++;
    console.log('Added resource for high-risk history');
  }

  console.log('Total resource count:', resourceCount);

  // Assign level based on resource count
  if (resourceCount > 2) return 3;
  if (resourceCount > 0) return 4;
  return 5;
}