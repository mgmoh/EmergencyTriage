import { TriageForm } from "@/components/triage-form";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export default function TriagePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">New Patient Triage</h2>
            <p className="mt-1 text-sm text-gray-600">
              Enter patient information and chief complaint to begin triage process.
            </p>
          </div>
          
          <div className="border-t pt-6">
            <TriageForm />
          </div>
        </div>
      </main>
    </div>
  );
}
