import { User, Patient, Vitals, InsertUser, InsertPatient, InsertVitals } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Patient operations
  createPatient(patient: InsertPatient): Promise<Patient>;
  getPatient(id: number): Promise<Patient | undefined>;
  updatePatientStatus(id: number, status: string): Promise<Patient>;
  updatePatientPriority(id: number, priority: number): Promise<Patient>;
  getPatientQueue(): Promise<Patient[]>;
  
  // Vitals operations
  createVitals(vitals: InsertVitals): Promise<Vitals>;
  getPatientVitals(patientId: number): Promise<Vitals[]>;
  
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private patients: Map<number, Patient>;
  private vitals: Map<number, Vitals>;
  sessionStore: session.SessionStore;
  private currentId: number;
  private currentPatientId: number;
  private currentVitalsId: number;

  constructor() {
    this.users = new Map();
    this.patients = new Map();
    this.vitals = new Map();
    this.currentId = 1;
    this.currentPatientId = 1;
    this.currentVitalsId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id, isStaff: false };
    this.users.set(id, user);
    return user;
  }

  async createPatient(insertPatient: InsertPatient): Promise<Patient> {
    const id = this.currentPatientId++;
    const patient: Patient = {
      ...insertPatient,
      id,
      fhirId: null,
      priority: 3,
      status: "waiting",
      arrivalTime: new Date(),
    };
    this.patients.set(id, patient);
    return patient;
  }

  async getPatient(id: number): Promise<Patient | undefined> {
    return this.patients.get(id);
  }

  async updatePatientStatus(id: number, status: string): Promise<Patient> {
    const patient = this.patients.get(id);
    if (!patient) throw new Error("Patient not found");
    const updated = { ...patient, status };
    this.patients.set(id, updated);
    return updated;
  }

  async updatePatientPriority(id: number, priority: number): Promise<Patient> {
    const patient = this.patients.get(id);
    if (!patient) throw new Error("Patient not found");
    const updated = { ...patient, priority };
    this.patients.set(id, updated);
    return updated;
  }

  async getPatientQueue(): Promise<Patient[]> {
    return Array.from(this.patients.values())
      .sort((a, b) => a.priority - b.priority || a.arrivalTime.getTime() - b.arrivalTime.getTime());
  }

  async createVitals(insertVitals: InsertVitals): Promise<Vitals> {
    const id = this.currentVitalsId++;
    const vitals: Vitals = {
      ...insertVitals,
      id,
      timestamp: new Date(),
    };
    this.vitals.set(id, vitals);
    return vitals;
  }

  async getPatientVitals(patientId: number): Promise<Vitals[]> {
    return Array.from(this.vitals.values())
      .filter(v => v.patientId === patientId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }
}

export const storage = new MemStorage();
