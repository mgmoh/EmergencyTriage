# Emergency Department Triage System

A comprehensive emergency room triage application designed to streamline patient management and improve healthcare workflow efficiency. This system uses the Emergency Severity Index (ESI) algorithm to prioritize patients based on acuity and resource needs.

## Features

- **Advanced ESI Prioritization**: Automatically calculates patient priority (1-5) based on:
  - Chief complaint analysis
  - Vital signs assessment
  - Medical history integration
  - Resource utilization prediction

- **Patient Management**:
  - Priority-based patient queue
  - Patient status tracking (waiting, in progress, completed)
  - Medical history integration via FHIR
  - Vital signs recording and monitoring

- **User Authentication**:
  - Secure login/registration
  - Staff role designation

- **Technical Highlights**:
  - Optimized PostgreSQL connection pooling
  - Efficient database query handling
  - Real-time patient queue updates
  - FHIR integration for medical records

## Technology Stack

- **Frontend**: React, Tailwind CSS, shadcn/ui components
- **Backend**: Node.js, Express
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Passport.js
- **Healthcare Integration**: FHIR API

## ESI Level Calculation

The Emergency Severity Index (ESI) is a five-level triage algorithm that categorizes patients by acuity and resource needs:

- **Level 1**: Immediate life-saving intervention required
- **Level 2**: High-risk situation, severe pain/distress
- **Level 3**: Multiple resources needed (labs, imaging, procedures, consultations)
- **Level 4**: One resource needed
- **Level 5**: No resources needed

The system analyzes chief complaints for critical keywords, checks vital signs against danger thresholds, and considers the patient's medical history to assign the appropriate ESI level.

## Deployment Instructions

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database

### Steps to Deploy

1. **Clone the repository**:
   ```
   git clone <repository-url>
   cd emergency-triage-system
   ```

2. **Install dependencies**:
   ```
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env` file with the following variables:
   ```
   DATABASE_URL=postgresql://username:password@hostname:port/database?sslmode=require
   SESSION_SECRET=your_session_secret
   ```

4. **Run database migrations**:
   ```
   npm run db:push
   ```

5. **Start the application**:
   ```
   npm run dev
   ```

6. **Access the application**:
   Open your browser and navigate to `http://localhost:5000`

### Troubleshooting Login Issues

If you're experiencing login problems in a local deployment, try these solutions:

1. **Set SESSION_SECRET Environment Variable**:
   Make sure you've set a SESSION_SECRET in your .env file:
   ```
   SESSION_SECRET=your_strong_secret_key
   ```

2. **Database Migration Check**:
   Ensure tables are created properly:
   ```
   npm run db:push
   ```

3. **Create a Test User**:
   If you're having trouble registering, try using this curl command to manually create a user:
   ```
   curl -X POST http://localhost:5000/api/register \
     -H "Content-Type: application/json" \
     -d '{"username": "testuser", "password": "password123"}'
   ```

4. **Check Database Connection**:
   Verify your DATABASE_URL is correct and the database server is running

5. **Port Conflicts**:
   If port 5000 is already in use, modify the server to use a different port

6. **Browser Issues**:
   Try using a private/incognito window or clearing cookies for localhost

## Usage Guide

1. **Login or Register**: Create an account or log in
2. **Dashboard**: View the patient queue sorted by priority
3. **Add New Patient**:
   - Enter patient details and chief complaint
   - Search for FHIR records (demo: try "Harry Potter" or "Ron Weasley")
   - System calculates ESI level automatically
   - Submit to add to queue
4. **Update Patient Status**: Change status as patient progresses through treatment
5. **Record Vital Signs**: Add vital measurements for ongoing assessment

## Demo Data

The system includes demo FHIR records for:
- Harry Potter (with history of lightning scar curse, basilisk venom exposure)
- Ron Weasley (with history of broken arm, anxiety, splinching injury)

These can be accessed by searching for their names in the patient search.