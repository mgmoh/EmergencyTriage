import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const FHIR_SERVER = process.env.NEXT_PUBLIC_FHIR_SERVER || "https://hapi.fhir.org/baseR4";

// Mock FHIR data for demonstration
const MOCK_PATIENTS = {
  "harry-potter": {
    id: "harry-potter",
    name: [{ text: "Harry Potter" }],
    conditions: [
      {
        code: { text: "Lightning scar curse", coding: [{ code: "curse-scar" }] },
        severity: "moderate"
      },
      {
        code: { text: "Basilisk venom exposure", coding: [{ code: "magical-toxin" }] },
        severity: "severe"
      },
      {
        code: { text: "Chronic headaches", coding: [{ code: "headache" }] },
        severity: "severe"
      }
    ]
  },
  "ron-weasley": {
    id: "ron-weasley",
    name: [{ text: "Ron Weasley" }],
    conditions: [
      {
        code: { text: "Broken arm from Quidditch", coding: [{ code: "trauma" }] },
        severity: "moderate"
      },
      {
        code: { text: "Anxiety", coding: [{ code: "anxiety" }] },
        severity: "mild"
      },
      {
        code: { text: "Splinching injury", coding: [{ code: "magical-trauma" }] },
        severity: "severe"
      }
    ]
  }
};

export function useFHIRPatient(id: string | undefined) {
  const { toast } = useToast();

  return useQuery({
    queryKey: [`${FHIR_SERVER}/Patient/${id}`],
    queryFn: async () => {
      // For demo purposes, check mock data first
      if (id && id.toLowerCase() in MOCK_PATIENTS) {
        return MOCK_PATIENTS[id.toLowerCase() as keyof typeof MOCK_PATIENTS];
      }

      try {
        const res = await fetch(`${FHIR_SERVER}/Patient/${id}`);
        if (!res.ok) {
          throw new Error(res.status === 404 ? "Patient not found" : "Failed to fetch patient data");
        }
        return await res.json();
      } catch (error) {
        toast({
          title: "FHIR Error",
          description: error instanceof Error ? error.message : "Failed to fetch patient data",
          variant: "destructive",
        });
        throw error;
      }
    },
    enabled: !!id,
  });
}

export function useCreateFHIRPatient() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (patientData: any) => {
      const name = patientData.name[0].text.toLowerCase().replace(" ", "-");

      // For demo purposes, check if it's one of our mock patients
      if (name in MOCK_PATIENTS) {
        return MOCK_PATIENTS[name as keyof typeof MOCK_PATIENTS];
      }

      try {
        const res = await fetch(`${FHIR_SERVER}/Patient`, {
          method: "POST",
          headers: {
            "Content-Type": "application/fhir+json",
            "Accept": "application/fhir+json"
          },
          body: JSON.stringify(patientData),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => null);
          
          // Check for specific HAPI FHIR server errors
          if (errorData?.resourceType === "OperationOutcome" && 
              errorData.issue?.[0]?.diagnostics?.includes("CannotCreateTransactionException")) {
            // Generate a mock patient for demo purposes when server is down
            const mockPatient = {
              id: `mock-${Date.now()}`,
              resourceType: "Patient",
              name: patientData.name,
              conditions: [],
              meta: {
                lastUpdated: new Date().toISOString()
              }
            };
            toast({
              title: "Demo Mode",
              description: "The FHIR server is temporarily unavailable. Using demo data instead.",
              variant: "default",
            });
            return mockPatient;
          }

          throw new Error(
            `Failed to create FHIR patient: ${res.status} ${res.statusText}${
              errorData ? ` - ${JSON.stringify(errorData)}` : ""
            }`
          );
        }

        return await res.json();
      } catch (error) {
        console.error("FHIR Patient Creation Error:", error);
        
        // Generate a mock patient for demo purposes when there's an error
        const mockPatient = {
          id: `mock-${Date.now()}`,
          resourceType: "Patient",
          name: patientData.name,
          conditions: [],
          meta: {
            lastUpdated: new Date().toISOString()
          }
        };
        
        toast({
          title: "Demo Mode",
          description: "The FHIR server is temporarily unavailable. Using demo data instead.",
          variant: "default",
        });
        
        return mockPatient;
      }
    },
    onError: (error: Error) => {
      console.error("FHIR Mutation Error:", error);
      toast({
        title: "FHIR Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}