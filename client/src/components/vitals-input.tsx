import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertVitalsSchema } from "@shared/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface VitalsInputProps {
  patientId: number;
}

export function VitalsInput({ patientId }: VitalsInputProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm({
    resolver: zodResolver(insertVitalsSchema),
    defaultValues: {
      patientId,
      temperature: "",
      bloodPressure: "",
      heartRate: undefined,
      respiratoryRate: undefined,
      oxygenSaturation: undefined,
      painLevel: undefined,
    },
  });

  const createVitals = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/vitals", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/vitals`] });
      toast({
        title: "Success",
        description: "Vitals recorded",
      });
      form.reset({ patientId });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((data) => createVitals.mutate(data))} className="space-y-4">
        <FormField
          control={form.control}
          name="temperature"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Temperature (°C)</FormLabel>
              <FormControl>
                <Input {...field} type="text" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bloodPressure"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Blood Pressure</FormLabel>
              <FormControl>
                <Input {...field} placeholder="120/80" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="heartRate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Heart Rate (bpm)</FormLabel>
              <FormControl>
                <Input {...field} type="number" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="respiratoryRate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Respiratory Rate</FormLabel>
              <FormControl>
                <Input {...field} type="number" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="oxygenSaturation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Oxygen Saturation (%)</FormLabel>
              <FormControl>
                <Input {...field} type="number" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="painLevel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Pain Level (0-10)</FormLabel>
              <FormControl>
                <Input {...field} type="number" min="0" max="10" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">Record Vitals</Button>
      </form>
    </Form>
  );
}
