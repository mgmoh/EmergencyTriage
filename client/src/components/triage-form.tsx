import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPatientSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { calculateESILevel } from "@/lib/esi-calculator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useState, useEffect } from "react";
import { AlertCircle, Search } from "lucide-react";
import { useFHIRPatient, useSearchFHIRPatient, useAddCondition, useCreateFHIRPatient } from "@/hooks/use-fhir";
import { MedicalHistory } from "./medical-history";

interface PatientFormData {
  name: string;
  dateOfBirth: string;
  gender: string;
  chiefComplaint: string;
  fhirId?: string;
}

export function TriageForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [suggestedPriority, setSuggestedPriority] = useState<number | null>(null);
  const [fhirId, setFhirId] = useState<string | undefined>();
  const [patient, setPatient] = useState<any>(null);
  const { data: fhirPatient } = useFHIRPatient(fhirId);
  const searchFHIRPatient = useSearchFHIRPatient();
  const addCondition = useAddCondition();
  const createFHIRPatient = useCreateFHIRPatient();

  const form = useForm({
    resolver: zodResolver(insertPatientSchema),
    defaultValues: {
      name: "",
      dateOfBirth: new Date().toISOString().split('T')[0],
      gender: "",
      chiefComplaint: "",
    },
  });

  // Watch chief complaint to update ESI level
  const chiefComplaint = form.watch("chiefComplaint");

  // Update suggested priority when chief complaint changes
  const updateSuggestedPriority = () => {
    if (chiefComplaint && chiefComplaint.trim().length > 0) {
      const esiLevel = calculateESILevel(chiefComplaint.trim(), undefined, fhirPatient);
      setSuggestedPriority(esiLevel);
    } else {
      setSuggestedPriority(null);
    }
  };

  // Update ESI level when complaint changes
  useEffect(() => {
    updateSuggestedPriority();
  }, [chiefComplaint]);

  const createPatient = useMutation({
    mutationFn: async (data: PatientFormData) => {
      try {
        let fhirId = data.fhirId;
        
        // If no FHIR ID exists, create a new patient in FHIR
        if (!fhirId) {
          const fhirResponse = await createFHIRPatient.mutateAsync({
            resourceType: "Patient",
            name: [{ text: data.name }],
            birthDate: data.dateOfBirth,
            gender: data.gender
          });

          console.log('Created FHIR patient:', fhirResponse);

          if (!fhirResponse.id) {
            throw new Error("No FHIR ID returned from server");
          }
          fhirId = fhirResponse.id;
        }

        // Create or update patient in local database
        const patientData = {
          ...data,
          fhirId,
          priority: suggestedPriority || 5
        };

        console.log('Creating/updating local patient with data:', patientData);

        const response = await fetch("/api/patients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patientData)
        });

        if (!response.ok) {
          throw new Error(`Failed to create local patient: ${response.statusText}`);
        }

        const localPatient = await response.json();
        console.log('Created/updated local patient:', localPatient);

        // Add chief complaint as a condition if it's a new patient or if the complaint is different
        if (data.chiefComplaint) {
          try {
            await addCondition.mutateAsync({
              patientId: fhirId,
              chiefComplaint: data.chiefComplaint
            });
          } catch (error) {
            console.error("Failed to add condition:", error);
            // Continue even if condition creation fails
          }
        }

        return localPatient;
      } catch (error) {
        console.error('Patient creation error:', error);
        throw error;
      }
    },
    onSuccess: (data: any) => {
      console.log('Patient creation success:', data);
      toast({
        title: "Patient Added to Queue",
        description: "Patient has been added to the system.",
        variant: "default"
      });
      setPatient(data);
      setFhirId(data.fhirId);
    },
    onError: (error: Error) => {
      console.error('Patient creation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add patient to queue. Please try again.",
        variant: "destructive"
      });
    }
  });

  const onSubmit = async (data: any) => {
    if (!data.gender) {
      toast({
        title: "Error",
        description: "Please select a gender",
        variant: "destructive",
      });
      return;
    }

    if (!suggestedPriority) {
      toast({
        title: "Error",
        description: "Please enter a chief complaint to calculate priority",
        variant: "destructive",
      });
      return;
    }

    createPatient.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Patient Name</FormLabel>
              <FormControl>
                <div className="flex gap-2">
                  <Input {...field} placeholder="Enter patient name" />
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => {
                      if (field.value) {
                        // Reset previous search results
                        setFhirId(undefined);
                        searchFHIRPatient.mutate(field.value, {
                          onSuccess: (data) => {
                            console.log('Search result:', data);
                            setFhirId(data.id);
                            // Update form with patient data if found
                            if (data.name?.[0]?.text) {
                              form.setValue('name', data.name[0].text);
                            }
                            if (data.birthDate) {
                              form.setValue('dateOfBirth', data.birthDate);
                            }
                            if (data.gender) {
                              form.setValue('gender', data.gender);
                            }
                            // Don't populate chief complaint
                            toast({
                              title: "Patient Found",
                              description: "Patient information loaded successfully.",
                            });
                          },
                          onError: (error) => {
                            console.error('Search error:', error);
                            toast({
                              title: "Patient Not Found",
                              description: "No patient found with that name. Please add them to the queue.",
                              variant: "destructive",
                            });
                          }
                        });
                      }
                    }}
                    disabled={searchFHIRPatient.isPending}
                  >
                    <Search className="h-4 w-4 mr-2" />
                    {searchFHIRPatient.isPending ? "Searching..." : "Search FHIR"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setFhirId(undefined);
                      setSuggestedPriority(null);
                      form.reset();
                    }}
                  >
                    Clear Search
                  </Button>
                </div>
              </FormControl>
              <p className="text-sm text-muted-foreground mt-1">
                Search for existing patients or add a new patient to the queue
              </p>
            </FormItem>
          )}
        />

        <MedicalHistory 
          fhirPatient={fhirPatient} 
          currentComplaint={chiefComplaint}
        />

        <FormField
          control={form.control}
          name="dateOfBirth"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date of Birth</FormLabel>
              <FormControl>
                <Input 
                  type="date" 
                  {...field}
                  max={new Date().toISOString().split('T')[0]}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gender</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="chiefComplaint"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Chief Complaint</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  placeholder="Describe the main reason for visit"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {suggestedPriority && (
          <Alert className={suggestedPriority <= 2 ? "border-red-500 bg-red-50" : undefined}>
            <AlertCircle className={suggestedPriority <= 2 ? "text-red-500" : undefined} />
            <AlertTitle>Suggested ESI Level: {suggestedPriority}</AlertTitle>
            <AlertDescription>
              Based on the chief complaint{fhirPatient ? " and medical history" : ""}, 
              this patient is classified as{' '}
              {suggestedPriority === 1 ? 'Critical - Immediate life-saving intervention needed' :
               suggestedPriority === 2 ? 'Emergent - High risk situation' :
               suggestedPriority === 3 ? 'Urgent - Multiple resources needed' :
               suggestedPriority === 4 ? 'Less Urgent - One resource needed' :
               'Non-urgent - No resources needed'}
            </AlertDescription>
          </Alert>
        )}

        <Button 
          type="submit" 
          className="w-full"
          disabled={createPatient.isPending}
        >
          {createPatient.isPending ? "Adding..." : "Add to Queue"}
        </Button>
      </form>
    </Form>
  );
}