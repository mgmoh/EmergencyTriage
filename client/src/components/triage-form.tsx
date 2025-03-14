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
import { useState } from "react";
import { AlertCircle } from "lucide-react";

export function TriageForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [suggestedPriority, setSuggestedPriority] = useState<number | null>(null);

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
    if (chiefComplaint) {
      const esiLevel = calculateESILevel(chiefComplaint);
      setSuggestedPriority(esiLevel);
    }
  };

  const createPatient = useMutation({
    mutationFn: async (data: any) => {
      if (!suggestedPriority) {
        throw new Error("Priority level not calculated");
      }

      const patientData = {
        ...data,
        priority: suggestedPriority,
      };

      const res = await apiRequest("POST", "/api/patients", patientData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients/queue"] });
      toast({
        title: "Success",
        description: "Patient added to queue",
      });
      form.reset();
      setSuggestedPriority(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
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
                <Input {...field} placeholder="Enter patient name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
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
                  onChange={(e) => {
                    field.onChange(e);
                    // Update ESI level when complaint changes
                    updateSuggestedPriority();
                  }}
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
              Based on the chief complaint, this patient is classified as{' '}
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