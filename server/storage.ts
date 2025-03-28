import { User, Patient, Vitals, InsertUser, InsertPatient, InsertVitals } from "@shared/schema";
import session from "express-session";
import * as schema from "@shared/schema";
import connectPg from "connect-pg-simple";
import { eq, asc, desc } from "@shared/schema";
import { db, pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createPatient(patient: InsertPatient): Promise<Patient>;
  getPatient(id: number): Promise<Patient | undefined>;
  updatePatientStatus(id: number, status: string): Promise<Patient>;
  updatePatientPriority(id: number, priority: number): Promise<Patient>;
  getPatientQueue(): Promise<Patient[]>;
  createVitals(vitals: InsertVitals): Promise<Vitals>;
  getPatientVitals(patientId: number): Promise<Vitals[]>;
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool, // Use the pool instead of client
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const users = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
    return users[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const users = await db.select().from(schema.users).where(eq(schema.users.username, username)).limit(1);
    return users[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(schema.users).values(insertUser).returning();
    return user;
  }

  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    const [patient] = await db.insert(schema.patients).values({
      ...insertPatient,
      priority: insertPatient.priority || 3,
      status: "waiting",
      arrivalTime: new Date(),
    }).returning();
    return patient;
  }

  async getPatient(id: number): Promise<Patient | undefined> {
    const patients = await db.select().from(schema.patients).where(eq(schema.patients.id, id)).limit(1);
    return patients[0];
  }

  async updatePatientStatus(id: number, status: string): Promise<Patient> {
    const [patient] = await db
      .update(schema.patients)
      .set({ status })
      .where(eq(schema.patients.id, id))
      .returning();

    if (!patient) throw new Error("Patient not found");
    return patient;
  }

  async updatePatientPriority(id: number, priority: number): Promise<Patient> {
    const [patient] = await db
      .update(schema.patients)
      .set({ priority })
      .where(eq(schema.patients.id, id))
      .returning();

    if (!patient) throw new Error("Patient not found");
    return patient;
  }

  async getPatientQueue(): Promise<Patient[]> {
    return db
      .select()
      .from(schema.patients)
      .orderBy(asc(schema.patients.priority), asc(schema.patients.arrivalTime));
  }

  async createVitals(insertVitals: InsertVitals): Promise<Vitals> {
    const [vitals] = await db.insert(schema.vitals).values({
      ...insertVitals,
      timestamp: new Date(),
    }).returning();
    return vitals;
  }

  async getPatientVitals(patientId: number): Promise<Vitals[]> {
    return db
      .select()
      .from(schema.vitals)
      .where(eq(schema.vitals.patientId, patientId))
      .orderBy(desc(schema.vitals.timestamp));
  }
}

export const storage = new DatabaseStorage();