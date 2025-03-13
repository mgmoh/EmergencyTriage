import { PatientQueue } from "@/components/patient-queue";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

export default function Dashboard() {
  const { logoutMutation } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-primary">ER Triage</h1>
            <div className="flex items-center gap-4">
              <Link href="/triage">
                <Button variant="outline">New Patient</Button>
              </Link>
              <Button
                variant="ghost"
                onClick={() => logoutMutation.mutate()}
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Patient Queue</h2>
          <PatientQueue />
        </div>
      </main>
    </div>
  );
}
