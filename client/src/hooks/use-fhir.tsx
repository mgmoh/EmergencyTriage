import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

const FHIR_SERVER = "http://hapi.fhir.org/baseR4";

export function useFHIRPatient(id: string | undefined) {
  return useQuery({
    queryKey: [`${FHIR_SERVER}/Patient/${id}`],
    enabled: !!id,
  });
}

export function useCreateFHIRPatient() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (patientData: any) => {
      const res = await fetch(`${FHIR_SERVER}/Patient`, {
        method: "POST",
        headers: {
          "Content-Type": "application/fhir+json",
        },
        body: JSON.stringify(patientData),
      });

      if (!res.ok) {
        throw new Error("Failed to create FHIR patient");
      }

      return await res.json();
    },
    onError: (error: Error) => {
      toast({
        title: "FHIR Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
