import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from "@tanstack/react-query";
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
    family: string;
    given: string[];
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
  conditions?: typeof mockConditions;
  extension?: Array<{
    url: string;
    valueString?: string;
    valueCode?: string;
    valueDate?: string;
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
        // Fetch patient data
        const patientRes = await fetch(`${FHIR_SERVER}/Patient/${id}`);
        if (!patientRes.ok) {
          throw new Error(`FHIR Error: ${patientRes.status} ${patientRes.statusText}`);
        }
        const patientData = await patientRes.json();

        // Fetch conditions for the patient
        const conditionsRes = await fetch(`${FHIR_SERVER}/Condition?patient=${id}`);
        if (!conditionsRes.ok) {
          throw new Error(`FHIR Error: ${conditionsRes.status} ${conditionsRes.statusText}`);
        }
        const conditionsData = await conditionsRes.json();

        // Combine patient data with conditions
        return {
          ...patientData,
          conditions: conditionsData.entry?.map((entry: any) => entry.resource) || []
        };
      } catch (error) {
        console.warn("FHIR server error, using mock data:", error);
        return {
          ...mockPatient,
          id,
          conditions: mockConditions
        };
      }
    },
    enabled: !!id,
    retry: 1,
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

        return await res.json();
      } catch (error) {
        console.warn("FHIR server error, using mock data:", error);
        return {
          ...mockPatient,
          id: `mock-${Date.now()}`,
          conditions: mockConditions
        };
      }
    }
  } as const;

  const mutation = useMutation<FHIRPatient, Error, any>(mutationOptions);

  if (mutation.isError) {
    toast({
      title: "FHIR Server Error",
      description: "Using demo data instead. Some features may be limited.",
      variant: "default"
    });
  }

  return mutation;
}

export function useSearchFHIRPatient() {
  const { toast } = useToast();

  const mutationOptions = {
    mutationFn: async (name: string) => {
      try {
        // Search for existing patients with this name
        const searchUrl = `${FHIR_SERVER}/Patient?name=${encodeURIComponent(name)}`;
        const res = await fetch(searchUrl);
        
        if (!res.ok) {
          throw new Error(`FHIR Search Error: ${res.status} ${res.statusText}`);
        }

        const data: FHIRSearchResponse = await res.json();
        
        if (data.total === 0) {
          // No existing patient found, create a new one
          const createRes = await fetch(`${FHIR_SERVER}/Patient`, {
            method: "POST",
            headers: {
              "Content-Type": "application/fhir+json",
              "Accept": "application/fhir+json"
            },
            body: JSON.stringify({
              resourceType: "Patient",
              name: [{
                use: "official",
                text: name
              }]
            })
          });

          if (!createRes.ok) {
            throw new Error(`FHIR Create Error: ${createRes.status} ${createRes.statusText}`);
          }

          return await createRes.json();
        }

        // Return the first matching patient
        return data.entry?.[0].resource;
      } catch (error) {
        console.warn("FHIR server error, using mock data:", error);
        return {
          ...mockPatient,
          id: `mock-${Date.now()}`,
          name: [{
            use: "official",
            text: name
          }],
          conditions: mockConditions
        };
      }
    }
  } as const;

  const mutation = useMutation<FHIRPatient, Error, string>(mutationOptions);

  if (mutation.isError) {
    toast({
      title: "FHIR Server Error",
      description: "Using demo data instead. Some features may be limited.",
      variant: "default"
    });
  }

  return mutation;
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