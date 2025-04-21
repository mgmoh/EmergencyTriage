import { useQuery, useMutation, UseQueryOptions, UseMutationOptions, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// Use a more reliable FHIR server
const FHIR_SERVER = process.env.NEXT_PUBLIC_FHIR_SERVER || "https://r4.smarthealthit.org";

// Mock FHIR data for demonstration
const mockPatient = {
  resourceType: "Patient",
  id: "example",
  meta: {
    versionId: "1",
    lastUpdated: "2023-01-01T12:00:00Z"
  },
  text: {
    status: "generated",
    div: "<div>Mock Patient Data</div>"
  },
  identifier: [
    {
      use: "usual",
      system: "urn:oid:2.16.840.1.113883.2.4.6.3",
      value: "12345"
    }
  ],
  active: true,
  name: [
    {
      use: "official",
      family: "Doe",
      given: ["John"]
    }
  ],
  gender: "male",
  birthDate: "1974-12-25",
  address: [
    {
      use: "home",
      line: ["123 Main St"],
      city: "Anytown",
      state: "CA",
      postalCode: "12345",
      country: "USA"
    }
  ]
};

const mockConditions = [
  {
    resourceType: "Condition",
    id: "condition-1",
    clinicalStatus: {
      coding: [
        {
          system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
          code: "active",
          display: "Active"
        }
      ]
    },
    code: {
      coding: [
        {
          system: "http://snomed.info/sct",
          code: "44054006",
          display: "Diabetes mellitus type 2"
        }
      ],
      text: "Type 2 Diabetes"
    },
    subject: {
      reference: "Patient/example"
    },
    onsetDateTime: "2010-01-01"
  }
];

interface FHIRPatient {
  resourceType: string;
  id: string;
  meta?: {
    versionId: string;
    lastUpdated: string;
  };
  text?: {
    status: string;
    div: string;
  };
  identifier?: Array<{
    use: string;
    system: string;
    value: string;
  }>;
  active?: boolean;
  name?: Array<{
    use: string;
    text?: string;
    family?: string;
    given?: string[];
  }>;
  gender?: string;
  birthDate?: string;
  address?: Array<{
    use: string;
    line: string[];
    city: string;
    state: string;
    postalCode: string;
    country: string;
  }>;
  conditions?: Array<{
    resourceType: "Condition";
    id: string;
    clinicalStatus: {
      coding: Array<{
        system: string;
        code: string;
        display: string;
      }>;
    };
    code: {
      coding: Array<{
        system: string;
        code: string;
        display: string;
      }>;
      text: string;
    };
    subject: {
      reference: string;
    };
    onsetDateTime?: string;
    severity?: {
      coding: Array<{
        system: string;
        code: string;
        display: string;
      }>;
      text: string;
    };
  }>;
}

interface FHIRSearchResponse {
  resourceType: "Bundle";
  type: "searchset";
  total: number;
  entry?: Array<{
    resource: FHIRPatient;
  }>;
}

export function useFHIRPatient(id: string | undefined) {
  const { toast } = useToast();

  const queryOptions = {
    queryKey: [`${FHIR_SERVER}/Patient/${id}`] as const,
    queryFn: async () => {
      try {
        if (!id) {
          throw new Error("No patient ID provided");
        }

        console.log('Fetching patient:', id); // Debug log

        // Fetch patient data
        const patientRes = await fetch(`${FHIR_SERVER}/Patient/${id}`);
        if (!patientRes.ok) {
          throw new Error(`FHIR Error: ${patientRes.status} ${patientRes.statusText}`);
        }
        const patientData = await patientRes.json();
        console.log('Fetched patient data:', patientData);

        // Fetch conditions for the patient with retry
        let conditionsData;
        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries) {
          const conditionsRes = await fetch(`${FHIR_SERVER}/Condition?patient=${id}`);
          if (!conditionsRes.ok) {
            throw new Error(`FHIR Error: ${conditionsRes.status} ${conditionsRes.statusText}`);
          }
          conditionsData = await conditionsRes.json();
          console.log(`Attempt ${retryCount + 1} - Fetched conditions:`, conditionsData);

          if (conditionsData.total > 0 || retryCount === maxRetries - 1) {
            break;
          }

          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
          retryCount++;
        }

        // Combine patient data with conditions
        const combinedData = {
          ...patientData,
          conditions: conditionsData.entry?.map((entry: any) => entry.resource) || []
        };
        console.log('Combined patient and conditions data:', combinedData);

        return combinedData;
      } catch (error) {
        console.error("FHIR server error:", error);
        toast({
          title: "FHIR Server Error",
          description: "Using demo data instead. Some features may be limited.",
          variant: "default"
        });
        return {
          ...mockPatient,
          id,
          conditions: mockConditions
        };
      }
    },
    enabled: !!id,
    retry: 3,
    retryDelay: (attemptIndex: number) => Math.min(1000 * Math.pow(2, attemptIndex), 30000),
    staleTime: 5 * 60 * 1000, // 5 minutes
  } as const;

  const query = useQuery<FHIRPatient, Error>(queryOptions);

  if (query.isError) {
    toast({
      title: "FHIR Server Error",
      description: "Using demo data instead. Some features may be limited.",
      variant: "default"
    });
  }

  return query;
}

export function useCreateFHIRPatient() {
  const { toast } = useToast();

  const mutationOptions = {
    mutationFn: async (patientData: any) => {
      try {
        console.log('Creating FHIR patient:', patientData); // Debug log

        const res = await fetch(`${FHIR_SERVER}/Patient`, {
          method: "POST",
          headers: {
            "Content-Type": "application/fhir+json",
            "Accept": "application/fhir+json"
          },
          body: JSON.stringify(patientData)
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(`FHIR Error: ${res.status} ${res.statusText} - ${JSON.stringify(errorData)}`);
        }

        const newPatient = await res.json();
        console.log('Created FHIR patient:', newPatient); // Debug log

        return newPatient;
      } catch (error) {
        console.error("FHIR server error:", error);
        toast({
          title: "FHIR Server Error",
          description: "Could not create patient in FHIR server.",
          variant: "destructive"
        });
        throw error;
      }
    }
  } as const;

  return useMutation<any, Error, any>(mutationOptions);
}

export function useSearchFHIRPatient() {
  const { toast } = useToast();

  const mutationOptions = {
    mutationFn: async (name: string) => {
      try {
        console.log('Searching for patient with name:', name);
        
        // Search for existing patients with this name
        const searchUrl = `${FHIR_SERVER}/Patient?name=${encodeURIComponent(name)}`;
        const res = await fetch(searchUrl);
        
        if (!res.ok) {
          throw new Error(`FHIR Search Error: ${res.status} ${res.statusText}`);
        }

        const data: FHIRSearchResponse = await res.json();
        console.log('Search results:', data);
        
        if (data.total === 0) {
          console.log('No existing patient found');
          throw new Error("No patient found with that name");
        }

        // Return the first matching patient with their conditions
        const patient = data.entry?.[0]?.resource;
        if (!patient) {
          throw new Error("No patient found in search results");
        }

        console.log('Found existing patient:', patient);

        // Fetch conditions for the patient with retry
        let conditionsData;
        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries) {
          const conditionsRes = await fetch(`${FHIR_SERVER}/Condition?patient=${patient.id}`);
          if (!conditionsRes.ok) {
            throw new Error(`FHIR Error: ${conditionsRes.status} ${conditionsRes.statusText}`);
          }
          conditionsData = await conditionsRes.json();
          console.log(`Attempt ${retryCount + 1} - Fetched conditions:`, conditionsData);

          if (conditionsData.total > 0 || retryCount === maxRetries - 1) {
            break;
          }

          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
          retryCount++;
        }
        
        const result = {
          ...patient,
          conditions: conditionsData.entry?.map((entry: any) => entry.resource) || []
        };
        console.log('Returning patient with conditions:', result);
        return result;
      } catch (error: unknown) {
        console.warn("FHIR server error:", error);
        const errorMessage = error instanceof Error ? error.message : "Could not search for patient.";
        toast({
          title: "FHIR Server Error",
          description: errorMessage,
          variant: "destructive"
        });
        throw error;
      }
    }
  } as const;

  return useMutation<FHIRPatient, Error, string>(mutationOptions);
}

export function useUpdateFHIRPatient() {
  const { toast } = useToast();

  const mutationOptions = {
    mutationFn: async ({ id, data }: { id: string; data: Partial<FHIRPatient> }) => {
      try {
        const res = await fetch(`${FHIR_SERVER}/Patient/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/fhir+json",
            "Accept": "application/fhir+json"
          },
          body: JSON.stringify({
            ...data,
            resourceType: "Patient",
            id: id
          })
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(`FHIR Update Error: ${res.status} ${res.statusText} - ${JSON.stringify(errorData)}`);
        }

        return await res.json();
      } catch (error) {
        console.warn("FHIR server error:", error);
        toast({
          title: "FHIR Update Error",
          description: "Could not update patient information in FHIR server.",
          variant: "destructive"
        });
        throw error;
      }
    }
  } as const;

  return useMutation<FHIRPatient, Error, { id: string; data: Partial<FHIRPatient> }>(mutationOptions);
}

export function useAddCondition() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutationOptions = {
    mutationFn: async ({ patientId, chiefComplaint }: { patientId: string; chiefComplaint: string }) => {
      try {
        console.log('Adding condition for patient:', patientId); // Debug log
        
        const conditionData = {
          resourceType: "Condition",
          clinicalStatus: {
            coding: [{
              system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
              code: "active",
              display: "Active"
            }]
          },
          code: {
            coding: [{
              system: "http://snomed.info/sct",
              code: "409586006",
              display: "Chief complaint"
            }],
            text: chiefComplaint
          },
          subject: {
            reference: `Patient/${patientId}`
          },
          onsetDateTime: new Date().toISOString()
        };

        console.log('Condition data:', conditionData); // Debug log

        // Try to create the condition with retries
        let retryCount = 0;
        const maxRetries = 3;
        let newCondition;

        while (retryCount < maxRetries) {
          try {
            const res = await fetch(`${FHIR_SERVER}/Condition`, {
              method: "POST",
              headers: {
                "Content-Type": "application/fhir+json",
                "Accept": "application/fhir+json"
              },
              body: JSON.stringify(conditionData)
            });

            if (!res.ok) {
              throw new Error(`FHIR Error: ${res.status} ${res.statusText}`);
            }

            newCondition = await res.json();
            console.log(`Attempt ${retryCount + 1} - Created condition:`, newCondition);

            // Verify the condition was created
            const verifyRes = await fetch(`${FHIR_SERVER}/Condition?patient=${patientId}`);
            if (!verifyRes.ok) {
              throw new Error(`Verification Error: ${verifyRes.status} ${verifyRes.statusText}`);
            }
            const verifyData = await verifyRes.json();
            console.log('Verified conditions:', verifyData);

            if (verifyData.total > 0) {
              break;
            }

            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
            retryCount++;
          } catch (error) {
            console.error(`Attempt ${retryCount + 1} failed:`, error);
            if (retryCount === maxRetries - 1) {
              throw error;
            }
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
            retryCount++;
          }
        }
        
        // Invalidate the patient query to force a refresh
        queryClient.invalidateQueries({ queryKey: [`${FHIR_SERVER}/Patient/${patientId}`] });
        
        return newCondition;
      } catch (error) {
        console.error("FHIR server error:", error);
        toast({
          title: "FHIR Server Error",
          description: "Could not add condition to patient record.",
          variant: "destructive"
        });
        throw error;
      }
    }
  } as const;

  return useMutation<any, Error, { patientId: string; chiefComplaint: string }>(mutationOptions);
}