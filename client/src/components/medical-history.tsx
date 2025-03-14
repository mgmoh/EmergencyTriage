import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Heart } from "lucide-react";

// These are the conditions that affect ESI level calculation
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

interface MedicalHistoryProps {
  fhirPatient: any;
  currentComplaint?: string;
}

export function MedicalHistory({ fhirPatient, currentComplaint }: MedicalHistoryProps) {
  if (!fhirPatient?.conditions?.length) {
    return null;
  }

  const conditions = fhirPatient.conditions;

  // Separate conditions into high risk and others
  const highRiskConditions = conditions.filter((condition: any) => {
    const conditionText = condition?.code?.text?.toLowerCase() || '';
    return HIGH_RISK_CONDITIONS.some(risk => conditionText.includes(risk.toLowerCase()));
  });

  const otherConditions = conditions.filter((condition: any) => {
    const conditionText = condition?.code?.text?.toLowerCase() || '';
    return !HIGH_RISK_CONDITIONS.some(risk => conditionText.includes(risk.toLowerCase()));
  });

  // Check if any conditions are related to current complaint
  const hasRelatedConditions = currentComplaint && conditions.some((condition: any) => {
    const conditionText = condition?.code?.text?.toLowerCase() || '';
    return currentComplaint.toLowerCase().includes(conditionText) ||
           conditionText.includes(currentComplaint.toLowerCase());
  });

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-primary" />
          <CardTitle>Medical History</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasRelatedConditions && (
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertCircle className="text-yellow-600" />
            <AlertTitle>Related Medical History</AlertTitle>
            <AlertDescription>
              Patient has existing conditions that may be related to the current complaint.
              This will be considered in the ESI level calculation.
            </AlertDescription>
          </Alert>
        )}

        {highRiskConditions.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">High Risk Conditions:</h4>
            <div className="flex flex-wrap gap-2">
              {highRiskConditions.map((condition: any, index: number) => (
                <Badge key={index} variant="destructive">
                  {condition.code?.text}
                  {condition.severity?.toLowerCase() === 'severe' && (
                    <span className="ml-1 text-xs">(Severe)</span>
                  )}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {otherConditions.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Other Conditions:</h4>
            <div className="flex flex-wrap gap-2">
              {otherConditions.map((condition: any, index: number) => (
                <Badge key={index} variant="outline">
                  {condition.code?.text}
                  {condition.severity?.toLowerCase() === 'severe' && (
                    <span className="ml-1 text-xs">(Severe)</span>
                  )}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}