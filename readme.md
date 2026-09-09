# MedFlow AI - Realtime Hospital Management System

An AI-powered realtime hospital management system built with a modern full-stack architecture.

The system provides role-based hospital management for administrators, doctors, nurses, pharmacists, laboratory technicians, and patients.

## Features

### Authentication & Authorization
- Better Auth authentication
- Role-based access control
- Protected backend APIs
- Patient ownership restrictions
- Secure session-based authorization

### Dashboard
- Hospital overview
- Realtime statistics
- Recent activity

### Patient Management
- Create and manage patients
- Patient profiles
- Patient admission workflow
- Patient-specific data access

### Doctor Management
- Doctor profiles
- Specialization and department information
- Doctor-specific appointment access

### Nursing Station
- Nursing workflow
- Patient-related operations
- Role-restricted access

### Pharmacy
- Medicine inventory
- Inventory management
- Prescription management
- Medicine dispensing
- Inventory quantity updates

### Laboratory
- Lab requests
- Lab result management
- X-Ray uploads
- AI-powered X-Ray analysis

### AI & Automation
- Gemini AI integration
- Inngest background workflows
- AI X-Ray analysis
- Automated medical charge processing
- Patient admission workflow

### Appointments
- Patient appointment creation
- Doctor appointment management
- Appointment status management
- Role-based appointment access

### Telemedicine
- Telemedicine appointments
- Scheduled, active, and completed sessions
- Patient and doctor ownership protection

### Financial Records
- Invoice management
- Patient billing history
- Consultation, laboratory, pharmacy and X-Ray charges
- Polar billing integration

### Notifications
- User-specific notifications
- Unread notification count
- Realtime notification delivery

### Realtime Communication
- Socket.IO
- Authenticated socket connections
- User-specific realtime rooms
- Realtime hospital updates

### Support & Feedback
- Support tickets
- Feedback submission
- Rating system
- Administrative management

### Settings
- Hospital information
- Currency and timezone
- Billing configuration
- Tax configuration
- General hospital settings

## Technology Stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- Socket.IO Client

### Backend
- Node.js
- Express
- TypeScript
- MongoDB
- Mongoose
- Better Auth
- Socket.IO

### AI & Automation
- Google Gemini
- Inngest

### File Storage
- UploadThing

### Payments
- Polar

## Project Structure

```text
ai-powered-realtime-hospital-management-system/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── inngest/
│   │   ├── lib/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   └── server.ts
│   └── package.json
│
├── frontend/
│   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   ├── routes/
│   │   └── ...
│   └── package.json
│
├── .gitignore
└── README.md