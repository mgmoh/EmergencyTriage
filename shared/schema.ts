import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isStaff: boolean("is_staff").notNull().default(false),
});

export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  fhirId: text("fhir_id"),
  name: text("name").notNull(),
  dateOfBirth: timestamp("date_of_birth").notNull(),
  gender: text("gender").notNull(),
  chiefComplaint: text("chief_complaint").notNull(),
  arrivalTime: timestamp("arrival_time").notNull().defaultNow(),
  priority: integer("priority").notNull().default(3), // 1 = highest, 5 = lowest
  status: text("status").notNull().default("waiting"), // waiting, in_progress, completed
});

export const vitals = pgTable("vitals", {
  id: serial("id").primaryKey(),
  patientId: integer("patient_id").notNull(),
  temperature: text("temperature"),
  bloodPressure: text("blood_pressure"),
  heartRate: integer("heart_rate"),
  respiratoryRate: integer("respiratory_rate"),
  oxygenSaturation: integer("oxygen_saturation"),
  painLevel: integer("pain_level"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Custom schema for patient insertion with date string handling
export const insertPatientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  dateOfBirth: z.string().transform((str) => new Date(str)),
  gender: z.string().min(1, "Gender is required"),
  chiefComplaint: z.string().min(1, "Chief complaint is required"),
  priority: z.number().min(1).max(5).optional(),
});

export const insertVitalsSchema = createInsertSchema(vitals).pick({
  patientId: true,
  temperature: true,
  bloodPressure: true,
  heartRate: true,
  respiratoryRate: true,
  oxygenSaturation: true,
  painLevel: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Patient = typeof patients.$inferSelect;
export type Vitals = typeof vitals.$inferSelect;
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type InsertVitals = z.infer<typeof insertVitalsSchema>;