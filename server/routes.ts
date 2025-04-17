import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertPatientSchema, insertVitalsSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);
  
  // Health check endpoint for container monitoring
  app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Patient routes
  app.post("/api/patients", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const data = insertPatientSchema.parse(req.body);
      // Ensure priority is between 1-5, default to 3 if not provided
      const priority = Math.min(Math.max(data.priority || 3, 1), 5);

      const patient = await storage.createPatient({
        ...data,
        priority, // Explicitly set the priority
      });
      res.status(201).json(patient);
    } catch (error) {
      res.status(400).json({ message: "Invalid patient data" });
    }
  });

  app.get("/api/patients/queue", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const queue = await storage.getPatientQueue();
    res.json(queue);
  });

  app.patch("/api/patients/:id/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const { id } = req.params;
    const { status } = req.body;
    
    try {
      const patient = await storage.updatePatientStatus(Number(id), status);
      res.json(patient);
    } catch (error) {
      res.status(404).json({ message: "Patient not found" });
    }
  });

  app.patch("/api/patients/:id/priority", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const { id } = req.params;
    const { priority } = req.body;
    
    try {
      const patient = await storage.updatePatientPriority(Number(id), priority);
      res.json(patient);
    } catch (error) {
      res.status(404).json({ message: "Patient not found" });
    }
  });

  // Vitals routes
  app.post("/api/vitals", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const data = insertVitalsSchema.parse(req.body);
      const vitals = await storage.createVitals(data);
      res.status(201).json(vitals);
    } catch (error) {
      res.status(400).json({ message: "Invalid vitals data" });
    }
  });

  app.get("/api/patients/:id/vitals", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const { id } = req.params;
    const vitals = await storage.getPatientVitals(Number(id));
    res.json(vitals);
  });

  const httpServer = createServer(app);
  return httpServer;
}