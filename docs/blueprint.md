# **App Name**: Pool BR Limpeza e Manutenção

## Core Features:

- Franchise Management: Allow master users to create and manage franchises, including setting franchise details, owner information, and initial configurations. This is achieved through the 'createFranchise' Firebase cloud function, which creates an Auth user, franchise doc, and user doc with owner role.
- User Role Management: Implement a role-based access control system to manage permissions for different user types (master, owner, technician, client), controlling access to features and data based on their role and franchise affiliation.
- Client Management: Enable franchise owners to manage client information, including adding new clients, editing existing details, managing addresses, contracts, and assigning technicians.
- Technician Management: Allow franchise owners to manage technician profiles, including adding new technicians, assigning them to specific clients or appointments, tracking their location, and managing their service reports. A cloud function 'createTechnician' may be invoked to create an Auth user.
- Appointment Scheduling: Provide a scheduling system for managing appointments, including scheduling new appointments, assigning technicians, tracking appointment status, and managing service reports.
- Service Report Generation: Enable technicians to generate and submit service reports, including capturing pool parameters (chlorine, pH, etc.), recording services performed, uploading photos, and finalizing appointments. Technicians will need the tool to help reason about whether photos and recorded data comply with standards and guidelines. Photos may be persisted to Firebase Storage with references to their URLs.
- Interactive Map Tracking: Use a location tracking tool integrated with a map to display the location of each technician, based on readings from their mobile app. Location coordinates are read from the franchise's technician record. It uses this along with polylines between appointments.

## Style Guidelines:

- Primary color: Deep blue (#1A237E), evoking trust, reliability, and cleanliness, reminiscent of clear pool water. It provides a professional and calming feel.
- Background color: Very light blue (#E3F2FD), a desaturated variant of the primary color, providing a clean and unobtrusive backdrop that emphasizes content.
- Accent color: Soft lavender (#C5CAE9), an analogous color to the deep blue, creating a harmonious yet distinct highlight for interactive elements and calls to action.
- Body and headline font: 'Inter', a grotesque-style sans-serif, is used for both headlines and body text due to its modern and neutral appearance, ensuring readability and a clean aesthetic across the app.
- Use a consistent set of icons to visually represent key features and actions within the app.
- Maintain a clean, organized, and intuitive layout across all screens. Use clear visual hierarchy and consistent spacing to enhance usability and reduce cognitive load.
- Incorporate subtle transitions and animations to provide visual feedback and enhance user engagement, such as smooth loading indicators and animated progress bars.