# Lief Attendance

A role-based attendance tracking application for healthcare organizations, enabling careworkers to clock in/out of shifts with geolocation validation and allowing managers to monitor attendance through dashboards and analytics.


---

## 1. Overview

**Roles & Functionalities**

- **Careworkers**
  - Clock in and clock out for shifts.
  - Location-based validation using geofencing.
  - View personal shift history.

- **Managers**
  - View clock-in/out history for all careworkers.
  - Configure geofencing radius for clock-in validation.
  - Analyze attendance data via charts and statistics.

---

## 2. Features Implemented (From Given Task List)

✅ **Careworker Side**
- Clock-in/Clock-out with geolocation.
- Shift history display.
- Geofencing validation to restrict clock-ins to defined perimeters. (Currently set to the perimeter more than actually required for testing purpose.)

✅ **Manager Side**
- Staff clock-in/out history view.
- Geofencing configuration (latitude, longitude, radius in meters).
- Dashboard analytics with:
  - Total hours worked.
  - Average check-in time.
  - Attendance compliance percentage.
  - Bar chart of hours worked per day.

✅ **Authentication**
- Auth0 authentication with role-based access control.

---

## 3. Tech Stack

**Frontend**
- React.js
- Apollo Client
- Auth0
- CSS (Custom Styles)
- Grommet
- Recharts

**Backend**
- Node.js
- Apollo Server (GraphQL)
- Prisma ORM
- PostgreSQL

**Other**
- HTML5 Geolocation API
- Haversine formula for geofencing distance calculation
- Deployment: Render (frontend) & (backend)

---

## 4. Codebase Structure

### Frontend
```
frontend/
│── src/
│   ├── components/         # Reusable components (Navbar, AuthButtons, Charts)
│   ├── context/             
│   ├── graphql/            # Queries & mutations for Apollo Client
│   ├── pages/              # Pages (Careworker, ManagerDashboard)
│   ├── App.js              # Route definitions & Auth0 logic
│   └── index.js            # Entry point
│── package.json
```

### Backend
```
backend/
│── prisma/
│   └── schema.prisma       # Database schema definition
│── src/
│   ├── index.js            # Apollo Server initialization
│── .env                    # Environment variables
│── package.json
```

---

## 5. Database Schema

**User Table**
- id (PK)
- name
- email
- role
- clockEvents


**ClockEvent Table**
- id (PK)
- user (FK) @relation(fields: [userId], references: [id])
- userId
- type
- note
- latitude
- longitude
- timestamp

**Setting Table**
- id (PK)
- name
- value


---

## 6. Running the Application Locally

**Backend**
```bash
cd backend
npm install
npx prisma migrate dev
node src/index.js
```

**Frontend**
```bash
cd frontend
npm install
npm start
```

---

## 7. Implementation Highlights

- **Geofencing Logic** — Uses the Haversine formula to validate if the device’s current location is within the manager-defined radius.
- **Role-Based Access** — Auth0 roles restrict access to manager or careworker features.
- **Analytics** — GraphQL queries aggregate attendance data for manager dashboards.

---

## 8. Future Improvements

- Offline clock-in support with auto-sync.
- Push/email reminders for late clock-ins.
- Exportable attendance reports.

---

## 9. Author

**Hardik Bhondve**  
Full Stack Developer Intern Candidate
