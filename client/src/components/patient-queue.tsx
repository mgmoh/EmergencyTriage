import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Patient } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

function getPriorityLabel(priority: number): string {
  switch (priority) {
    case 1: return "Critical";
    case 2: return "Urgent";
    case 3: return "Standard";
    case 4: return "Non-Urgent";
    case 5: return "Minor";
    default: return "Unknown";
  }
}

function getPriorityColor(priority: number): string {
  switch (priority) {
    case 1: return "bg-red-500 animate-pulse";
    case 2: return "bg-orange-500";
    case 3: return "bg-yellow-500";
    case 4: return "bg-blue-500";
    case 5: return "bg-green-500";
    default: return "bg-gray-500";
  }
}

function PriorityLegend() {
  return (
    <div className="flex flex-wrap gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
      <h3 className="w-full font-medium mb-2">Priority Levels:</h3>
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3, 4, 5].map((level) => (
          <div key={level} className="flex items-center gap-2">
            <Badge className={getPriorityColor(level)}>
              {level}
            </Badge>
            <span className="text-sm text-gray-600">{getPriorityLabel(level)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PatientQueue() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: patients, isLoading } = useQuery<Patient[]>({
    queryKey: ["/api/patients/queue"],
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/patients/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients/queue"] });
      toast({
        title: "Success",
        description: "Patient status updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div>Loading queue...</div>;
  }

  const hasHighPriority = patients?.some(patient => patient.priority <= 2);

  return (
    <div>
      {hasHighPriority && (
        <div className="flex items-center gap-2 p-4 mb-4 bg-red-50 text-red-700 rounded-lg">
          <AlertCircle className="h-5 w-5" />
          <span>Attention: There are high-priority patients in the queue!</span>
        </div>
      )}

      <PriorityLegend />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Priority</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Chief Complaint</TableHead>
              <TableHead>Arrival Time</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients?.map((patient) => (
              <TableRow 
                key={patient.id}
                className={patient.priority <= 2 ? "bg-red-50" : undefined}
              >
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge className={getPriorityColor(patient.priority)}>
                      {patient.priority}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {getPriorityLabel(patient.priority)}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="font-medium">{patient.name}</TableCell>
                <TableCell>{patient.chiefComplaint}</TableCell>
                <TableCell>
                  {format(new Date(patient.arrivalTime), "HH:mm")}
                </TableCell>
                <TableCell>
                  <Select
                    value={patient.status}
                    onValueChange={(value) => {
                      updateStatus.mutate({ id: patient.id, status: value });
                    }}
                  >
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="waiting">Waiting</SelectItem>
                      <SelectItem value="admitted">Admitted</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}