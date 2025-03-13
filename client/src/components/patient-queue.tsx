import { useQuery } from "@tanstack/react-query";
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

function getPriorityColor(priority: number): string {
  switch (priority) {
    case 1: return "bg-red-500";
    case 2: return "bg-orange-500";
    case 3: return "bg-yellow-500";
    case 4: return "bg-green-500";
    default: return "bg-blue-500";
  }
}

export function PatientQueue() {
  const { data: patients, isLoading } = useQuery<Patient[]>({
    queryKey: ["/api/patients/queue"],
  });

  if (isLoading) {
    return <div>Loading queue...</div>;
  }

  return (
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
            <TableRow key={patient.id}>
              <TableCell>
                <Badge className={getPriorityColor(patient.priority)}>
                  {patient.priority}
                </Badge>
              </TableCell>
              <TableCell>{patient.name}</TableCell>
              <TableCell>{patient.chiefComplaint}</TableCell>
              <TableCell>
                {format(new Date(patient.arrivalTime), "HH:mm")}
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {patient.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
