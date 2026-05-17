# AeroVertex
## Airport Ground Operations Management System

AeroVertex is a highly-normalized, database-driven management system for a regional airport. It features a live, accelerated, top-down simulation of an airport's daily operations. A complete 24-hour cycle of airport activity is compressed into an interactive 30-minute simulated "day" rendered on a stylized SVG map. Every aircraft movement, gate assignment, and status update is driven by real-time queries against a MySQL database.

## 🚀 Features

- **Database-Driven Simulation**: The entire simulation runs off pre-computed timelines stored in the database. Aircraft positions and statuses are mathematically interpolated based on their scheduled timestamps and the current simulation clock.
- **Interactive Map**: An SVG-based top-down map of the airport. Clicking on any aircraft, gate, or terminal element executes a live query to fetch and display its exact details from the database.
- **Realistic Flight Physics & Pathing**: Smooth aircraft spawning, realistic deceleration, and multi-segment pathing including dedicated pushback maneuvers for departures.
- **Proximity-Based Queuing**: Intelligent queuing logic to prevent aircraft overlap and simulate real-world taxiway congestion and delays.
- **Conflict Detection & Resource Allocation**: Database triggers enforce strict business rules, such as 15-minute gate turnaround buffers and gate-size compatibility, ensuring no two flights hold conflicting resources.
- **Delay Cascade Engine**: A recursive stored procedure that realistically propagates delays down a physical aircraft's daily flight schedule.
- **ATC & Cargo Dashboards**: Dedicated consoles for Air Traffic Control and Cargo Handling to visualize sequencing and operations.

## 🏗️ Architecture

AeroVertex is built on a clean three-tier architecture designed for serverless deployment:

1. **Front-End (React/Vite)**
   - Hosted on Vercel.
   - Manages the simulation clock and renders the interactive SVG map.
   - Interpolates aircraft coordinates strictly based on data retrieved from the backend API.
   - Styled with Tailwind CSS in a sleek, monochrome architectural aesthetic.
2. **API Layer (Node.js Serverless Functions)**
   - Hosted on Vercel.
   - Acts as a thin, stateless proxy executing SQL queries against the database and returning JSON.
3. **Database (MySQL - InnoDB)**
   - Normalized to Boyce-Codd Normal Form (BCNF) to prevent anomalies.
   - Contains all operational logic, constraints, procedures, and the simulation timeline.
   - Features custom triggers for audit logging (EventLog) and resource validation.

## 🛠️ Technology Stack

- **Frontend**: React, Vite, Tailwind CSS, SVG Graphics
- **Backend API**: Node.js, Vercel Serverless Functions, `mysql2` driver
- **Database**: MySQL (InnoDB) with heavily utilized Views, Triggers, and Stored Procedures

## ⚙️ Running Locally

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   Copy the `.env.example` file to `.env.local` and add your database credentials.
   ```bash
   cp .env.example .env.local
   ```
   Provide your Vercel/MySQL URI in `.env.local`.

3. **Database Initialization**
   Run the SQL scripts located in the `/db` folder to initialize the schema, triggers, and seed data.
   ```bash
   node db/reset.js
   ```

4. **Start the Development Server**
   Start the Vercel development server (which spins up both the frontend and the serverless functions).
   ```bash
   npx vercel dev
   ```

## 📖 The Conceptual Model

At the core of AeroVertex is a meticulously structured relational schema representing:
- **Terminals & Infrastructure**: Runways, Gates, Cargo Bays, and Ground Equipment.
- **Aviation Assets**: Airlines, Aircraft Types, and specific Aircraft Fleets.
- **Operations**: Scheduled Flights, Runway Slots, and Ground Service Assignments.
- **Tracking**: Service Logs, Passenger Flow Logs, Event Logs (audit trail), and Cargo Shipments.

All core constraints (like MTOW, wingspan, gate capacity) are heavily normalized to avoid update or insertion anomalies, allowing the airport to scale its synthetic data seamlessly.

---
*Built as a comprehensive DBMS course project demonstrating advanced SQL techniques, interactive front-end data visualization, and time-bounded resource allocation.*
