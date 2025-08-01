# Risk Intelligence Platform

## Overview
This is a full-stack web application designed as an insurance risk intelligence platform. Its primary purpose is to consolidate fragmented data sources into a unified dashboard, enabling insurance carriers, reinsurers, MGAs, and risk consultants to effectively assess, visualize, and manage risk exposure data across multiple channels. The platform aims to provide comprehensive risk analytics, AI-powered data processing, advanced reporting, and real-time risk monitoring to support enterprise insurance workflows.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built with **React** and **TypeScript**, using **Vite** as the build tool. **Radix UI** components are utilized with **Tailwind CSS** for styling, specifically through the `shadcn/ui` component system. **TanStack Query (React Query)** handles server state management, while **Wouter** provides lightweight client-side routing. Custom CSS variables support theming.

### Backend Architecture
The backend is a **Node.js** and **Express** server, also written in **TypeScript**. It interacts with a **PostgreSQL** database using **Drizzle ORM** for type-safe operations. Authentication is managed via **Replit OAuth** with session-based authentication, and **Multer** is used for handling file uploads. **Connect-pg-simple** provides PostgreSQL-backed session storage.

### Database Design
The platform employs a multi-tenant architecture supporting organizations and users. Key entities include data sources, data mappings, risk exposures, and export jobs. Session storage is managed in a dedicated table. **Neon serverless** is the chosen hosting solution for PostgreSQL.

### Core Architectural Decisions
- **Modularity**: Clear separation between frontend, backend API, and database operations.
- **Scalability**: Designed to be maintainable and scalable for enterprise-level insurance workflows.
- **Geospatial Visualization**: Integrated mapping capabilities using Leaflet for interactive geospatial data, with dynamic weather overlays from Tomorrow.io.
- **Data Pipeline**: Supports file upload, AI-assisted data mapping, and integration with third-party APIs.
- **Risk Analytics**: Incorporates features for risk exposure tracking, portfolio analysis, and predictive risk trend animation.
- **User Interface**: Features a dashboard, responsive navigation, and support for light/dark mode.
- **Authentication**: Utilizes Replit OAuth with server-side, PostgreSQL-backed sessions and organization-based user isolation.

## External Dependencies

### Core Infrastructure
- **Database**: Neon PostgreSQL serverless
- **Authentication**: Replit OAuth service
- **Frontend Build**: Vite (with React plugin)
- **UI Components**: Radix UI primitives, shadcn/ui

### Data Visualization & Mapping
- **Maps**: Leaflet (for interactive geospatial visualization)
- **Charts**: Recharts (for data visualization and analytics)
- **File Handling**: React Dropzone (for file upload UX)
- **Geocoding**: Mapbox Geocoder API
- **Weather Data**: Tomorrow.io API

### Development Tools
- **Type Safety**: TypeScript
- **Database ORM/Migrations**: Drizzle ORM, Drizzle Kit
- **Code Quality**: ESLint
- **Session Management**: connect-pg-simple
```