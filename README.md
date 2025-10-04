# E-Government Citizen Services Portal

**Capstone Project - E-Government Citizen Services Portal**

---

## What is this project about?

Imagine you don't need to visit government offices for things like passport renewal, national ID updates, business licenses (Interior Department), or other neccessary department. Instead, you log in to a website, submit your request, upload necessary documents, pay fees, and then simply wait for approval.

This project is an **online portal** that makes this possible.

The system has three user roles:

- **Citizens:** Apply for government services.
- **Government Officers:** Review and process citizen requests.
- **Admins:** Manage the system and generate reports.

The backend is built with **Node.js**, **Express**, and **PostgreSQL** with **Sequelize ORM**. The frontend uses **EJS templates** for server-rendered pages with Bootstrap for styling.

---

## Main Goals

- Enable citizens to apply for various government services online.
- Allow officers to review, approve, or reject applications.
- Provide admins with management tools and reports.

---

## Features

### 1. User Authentication & Roles

- **Citizens:** Register and apply for services.
- **Officers:** Review requests assigned to their department.
- **Department Heads:** Manage officers within departments.
- **Admins:** Oversee entire system, users, services, and departments.

### 2. Profiles

- Citizens can update their Name, National ID, Date of Birth, and Contact Info.
- Officers have profile details like Name, Department, and Job Title.

### 3. Service Requests

- Departments offer specific services (e.g., Passport Renewal, Business License or Interior).
- Citizens submit service applications with description and required documents.
- Application statuses flow through: Submitted → Under Review → Approved / Rejected.

### 4. Document Upload

- Citizens upload documents in **PDF** or **JPG** formats with size limits.

### 5. Payments (Simulated)

- Some services require fees.
- Payment simulation and success page provided.

### 6. Search & Filter

- Officers and admins can search requests by:
  - Name
  - Request ID
  - Status
  - Service type
  - Date range

### 7. Notifications

- Citizens receive in-app notifications when request status changes.

### 8. Reports & Statistics (Admin)

- View request counts per department.
- Track approved vs rejected requests.
- Total money collected from fees.

### 9. Multi-Department Support

- Departments access only their own requests.
- Admins access all requests.

### 10. User-friendly EJS-based Web Pages

- **Citizen pages:** Login, register, dashboard, service application, profile.
- **Officer pages:** Login, dashboard, request review.
- **Admin pages:** User, service, department management; reports.

---

## Technologies Used

- **Node.js** and **Express** for server-side logic.
- **PostgreSQL** with **Sequelize ORM** for database.
- **EJS** for templating.
- **bcrypt** for password hashing.
- **Multer** for file uploads.
- **Bootstrap** for UI styling.

---

## Database Structure (Simplified)

| Table         | Purpose                                       |
|---------------|-----------------------------------------------|
| users         | Stores all users (citizens, officers, admins) |
| departments   | Government departments (Interior, Commerce, etc.) |
| services      | Services offered by departments               |
| requests      | Service applications submitted by citizens   |
| documents     | Uploaded files linked to requests             |
| payments      | Payment records for service requests          |
| notifications | User notifications about requests             |

---

## Setup Instructions

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/e-gov-portal-app.git

2. Navigate to the backend folder and install dependencies:
cd e-gov-portal-app/backend
npm install

3. Create a .env file with your database configuration:
DB_USERNAME=your_db_username
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
DB_HOST=localhost
DB_PORT=5432
SESSION_SECRET=your_session_secret

4. Run database migrations and seed data if applicable.

5. Start the application:
npm start

# Notes
- This project focuses mainly on backend development with a simple but effective frontend using EJS templates to ensure clear navigation and usability.

- Change password functionality is still under development.
