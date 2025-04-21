import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { useFHIRPatient, useSearchFHIRPatient, useAddCondition, useCreateFHIRPatient } from "@/hooks/use-fhir";
import { MedicalHistory } from "./medical-history";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const triageSchema = z.object({
  name: z.string().min(1, "Name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["male", "female", "other"]),
  chiefComplaint: z.string().min(1, "Chief complaint is required"),
  vitalSigns: z.object({
    heartRate: z.number().min(0, "Heart rate must be positive"),
    bloodPressure: z.string().min(1, "Blood pressure is required"),
    respiratoryRate: z.number().min(0, "Respiratory rate must be positive"),
    temperature: z.number().min(0, "Temperature must be positive"),
    oxygenSaturation: z.number().min(0, "Oxygen saturation must be positive"),
  }),
});

type TriageFormData = z.infer<typeof triageSchema>;

export function TriageForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentComplaint, setCurrentComplaint] = useState<string>("");
  const [fhirPatient, setFhirPatient] = useState<any>(null);

  const { mutate: searchFHIRPatient } = useSearchFHIRPatient();
  const { mutate: addCondition } = useAddCondition();
  const { mutate: createFHIRPatient } = useCreateFHIRPatient();

  const form = useForm<TriageFormData>({
    resolver: zodResolver(triageSchema),
    defaultValues: {
      name: "",
      dateOfBirth: "",
      gender: "other",
      chiefComplaint: "",
      vitalSigns: {
        heartRate: 0,
        bloodPressure: "",
        respiratoryRate: 0,
        temperature: 0,
        oxygenSaturation: 0,
      },
    },
  });

  const createPatient = async (data: { name: string; dateOfBirth: string; gender: string }) => {
    try {
      const response = await createFHIRPatient({
        resourceType: "Patient",
        name: [{ text: data.name }],
        birthDate: data.dateOfBirth,
        gender: data.gender,
      });
      return response.id;
    } catch (error) {
      console.error("Failed to create patient:", error);
      throw error;
    }
  };

  const onSubmit = async (data: TriageFormData) => {
    try {
      const { name, dateOfBirth, gender } = data;
      const fhirId = await createPatient({ name, dateOfBirth, gender });
      
      if (fhirId) {
        setFhirPatient({ id: fhirId });
        toast({
          title: "Patient created",
          description: "Patient has been created in FHIR server",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create patient",
        variant: "destructive",
      });
    }
  };

  const handleSearch = (field: string, value: string) => {
    setFhirPatient(null);
    searchFHIRPatient(
      value,
      {
        onSuccess: (data) => {
          if (data) {
            setFhirPatient(data);
            form.setValue("name", data.name?.[0]?.given?.[0] || "");
            form.setValue("dateOfBirth", data.birthDate || "");
            form.setValue("gender", (data.gender || "other") as "male" | "female" | "other");
            toast({
              title: "Patient found",
              description: "Patient data has been loaded",
            });
          } else {
            toast({
              title: "No patient found",
              description: "No matching patient was found",
            });
          }
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Failed to search for patient",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Emergency Triage</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <div className="flex gap-2">
                <Input
                  id="name"
                  {...form.register("name")}
                  placeholder="Enter patient name"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSearch("name", form.getValues("name"))}
                >
                  Search FHIR
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                {...form.register("dateOfBirth")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select
                onValueChange={(value) => form.setValue("gender", value as "male" | "female" | "other")}
                defaultValue={form.getValues("gender")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="chiefComplaint">Chief Complaint</Label>
              <Input
                id="chiefComplaint"
                {...form.register("chiefComplaint")}
                placeholder="Enter chief complaint"
                onChange={(e) => setCurrentComplaint(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="heartRate">Heart Rate</Label>
              <Input
                id="heartRate"
                type="number"
                {...form.register("vitalSigns.heartRate", { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bloodPressure">Blood Pressure</Label>
              <Input
                id="bloodPressure"
                {...form.register("vitalSigns.bloodPressure")}
                placeholder="e.g., 120/80"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="respiratoryRate">Respiratory Rate</Label>
              <Input
                id="respiratoryRate"
                type="number"
                {...form.register("vitalSigns.respiratoryRate", { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="temperature">Temperature</Label>
              <Input
                id="temperature"
                type="number"
                {...form.register("vitalSigns.temperature", { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="oxygenSaturation">Oxygen Saturation</Label>
              <Input
                id="oxygenSaturation"
                type="number"
                {...form.register("vitalSigns.oxygenSaturation", { valueAsNumber: true })}
              />
            </div>
          </div>

          <Button type="submit">Submit</Button>
        </form>

        {fhirPatient && (
          <div className="mt-4">
            <MedicalHistory fhirPatient={fhirPatient} currentComplaint={currentComplaint} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}