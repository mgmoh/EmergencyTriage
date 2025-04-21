import { type InsertVitals } from "@shared/schema";

// ESI vital signs danger zone thresholds
const DANGER_ZONE = {
  heartRate: { min: 50, max: 120 },
  respiratoryRate: { min: 12, max: 25 },
  oxygenSaturation: { min: 92 }, // Below this needs immediate attention
  temperature: { min: 36, max: 38.5 }, // Celsius
};

// High-risk conditions that affect ESI level
const HIGH_RISK_CONDITIONS = [
  "diabetes",
  "heart disease",
  "stroke",
  "cancer",
  "asthma",
  "copd",
  "kidney disease",
  "liver disease",
  "immunodeficiency",
  "pregnancy"
];

// Keywords that indicate high severity
const HIGH_SEVERITY_KEYWORDS = [
  "chest pain",
  "difficulty breathing",
  "severe pain",
  "unconscious",
  "bleeding",
  "stroke",
  "heart attack",
  "seizure",
  "allergic reaction",
  "overdose"
];

// Keywords that indicate moderate severity
const MODERATE_SEVERITY_KEYWORDS = [
  "fever",
  "infection",
  "pain",
  "vomiting",
  "diarrhea",
  "rash",
  "injury",
  "sprain",
  "headache",
  "dizziness"
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

interface Condition {
  code: {
    coding: Array<{
      code: string;
      display: string;
    }>;
  };
  clinicalStatus: {
    coding: Array<{
      code: string;
    }>;
  };
}

export function calculateESILevel(
  chiefComplaint: string,
  vitalSigns?: {
    heartRate: number;
    bloodPressure: string;
    respiratoryRate: number;
    temperature: number;
    oxygenSaturation: number;
  },
  conditions?: Condition[]
): number {
  // Start with default level (3)
  let esiLevel = 3;
  const complaint = chiefComplaint.toLowerCase();

  // Check for high severity keywords
  if (HIGH_SEVERITY_KEYWORDS.some(keyword => complaint.includes(keyword))) {
    esiLevel = 1;
  }
  // Check for moderate severity keywords
  else if (MODERATE_SEVERITY_KEYWORDS.some(keyword => complaint.includes(keyword))) {
    esiLevel = 2;
  }

  // Check medical history for high-risk conditions
  if (conditions) {
    const hasHighRiskCondition = conditions.some((condition: Condition) => {
      const conditionText = condition.code.coding[0]?.display?.toLowerCase() || "";
      return HIGH_RISK_CONDITIONS.some(risk => conditionText.includes(risk));
    });

    if (hasHighRiskCondition) {
      // If patient has high-risk condition, increase severity by 1 level
      esiLevel = Math.max(1, esiLevel - 1);
    }
  }

  // Check vitals if available
  if (vitalSigns) {
    // Check for abnormal vital signs
    const abnormalVitals = checkAbnormalVitals(vitalSigns);
    if (abnormalVitals) {
      // If abnormal vitals, increase severity by 1 level
      esiLevel = Math.max(1, esiLevel - 1);
    }
  }

  // Ensure ESI level is between 1 and 5
  return Math.min(Math.max(esiLevel, 1), 5);
}

function checkAbnormalVitals(vitals: any): boolean {
  const {
    temperature,
    bloodPressure,
    heartRate,
    respiratoryRate,
    oxygenSaturation,
    painLevel
  } = vitals;

  // Check temperature
  if (temperature) {
    const temp = parseFloat(temperature);
    if (temp < 35 || temp > 39) return true;
  }

  // Check blood pressure
  if (bloodPressure) {
    const [systolic, diastolic] = bloodPressure.split('/').map(Number);
    if (systolic < 90 || systolic > 180 || diastolic < 60 || diastolic > 110) return true;
  }

  // Check heart rate
  if (heartRate) {
    const hr = parseInt(heartRate);
    if (hr < 50 || hr > 100) return true;
  }

  // Check respiratory rate
  if (respiratoryRate) {
    const rr = parseInt(respiratoryRate);
    if (rr < 12 || rr > 20) return true;
  }

  // Check oxygen saturation
  if (oxygenSaturation) {
    const spo2 = parseInt(oxygenSaturation);
    if (spo2 < 95) return true;
  }

  // Check pain level
  if (painLevel) {
    const pain = parseInt(painLevel);
    if (pain >= 7) return true;
  }

  return false;
}

function isSymptomRelated(complaint: string, condition: string): boolean {
  // Map of symptoms to related terms
  const symptomMap = {
    'headache': ['head', 'migraine', 'scar', 'cranial'],
    'chest': ['heart', 'cardiac', 'thoracic'],
    'breathing': ['breath', 'respiratory', 'asthma', 'copd'],
    'anxiety': ['stress', 'panic', 'nervous'],
    'trauma': ['injury', 'fracture', 'broken']
  };

  for (const [symptom, relatedTerms] of Object.entries(symptomMap)) {
    if ((complaint.includes(symptom) || relatedTerms.some(term => complaint.includes(term))) &&
        (condition.includes(symptom) || relatedTerms.some(term => condition.includes(term)))) {
      return true;
    }
  }
  return false;
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