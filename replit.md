# Risk Intelligence Platform

## Overview

This is an insurance risk intelligence platform built as a full-stack web application that consolidates fragmented data sources into a unified dashboard. The application is designed for insurance carriers, reinsurers, MGAs, and risk consultants to assess, visualize, and manage risk exposure data across multiple channels.

## Recent Changes (January 31, 2025)

### Enhanced Mapping and Weather Risk Integration
- **Integrated weather risk visualization** into the existing "Geospatial View" tab
- **Added Tomorrow.io API integration** via Python backend script for real-time weather data
- **Implemented comprehensive address lookup** with Mapbox Geocoder API integration
- **Created layered weather visualization** with temperature heat and wind pattern overlays
- **Added weather layer controls** with toggle switches for selective layer display
- **Implemented manual address search** with fly-to functionality and custom markers
- **Enhanced dual-mode Mapbox visualization** showing both risk exposures and weather risk data
- **Added interactive tabbed interface** to switch between exposure data and weather risk views
- **Improved risk scoring system** using fire index × wind speed calculations
- **Set up sample weather data** with 5 asset locations (LA, SF, Las Vegas, Phoenix, Sacramento)
- **Configured both Tomorrow.io and Mapbox API keys** in Replit Secrets for full functionality

## User Preferences

```
Preferred communication style: Simple, everyday language.
```

## System Architecture

### Frontend Architecture
- **React + TypeScript** with Vite as the build tool
- **UI Framework**: Radix UI components with Tailwind CSS for styling, using the shadcn/ui component system
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Styling**: Tailwind CSS with custom CSS variables for theming support

### Backend Architecture
- **Node.js + Express** server with TypeScript
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Authentication**: Replit OAuth integration with session-based authentication
- **File Upload**: Multer middleware for handling file uploads
- **Session Management**: PostgreSQL-backed sessions using connect-pg-simple

### Database Design
- Multi-tenant architecture with organizations and users
- Core entities: data sources, data mappings, risk exposures, and export jobs
- Session storage table for authentication
- PostgreSQL with Neon serverless hosting

## Key Components

### Authentication System
- **Strategy**: OAuth 2.0/OpenID Connect integration with Replit
- **Session Management**: Server-side sessions stored in PostgreSQL
- **Multi-tenant Support**: Organization-based user isolation

### Data Management Pipeline
- **File Upload**: Support for CSV and other data formats up to 10MB
- **Data Processing**: AI-assisted data mapping and transformation
- **Data Sources**: Integration with third-party APIs and internal systems
- **Export Capabilities**: Data export to various formats and BI tools

### Risk Analytics Engine
- **Risk Exposure Tracking**: Geographic and peril-based risk assessment
- **Portfolio Analysis**: Aggregated risk metrics and PML calculations
- **Visualization**: Interactive maps using Leaflet for geospatial data
- **Charts**: Recharts for portfolio analysis and risk distribution

### User Interface Components
- **Dashboard**: Main interface with risk metrics, charts, and maps
- **Data Upload**: Drag-and-drop file upload with progress tracking
- **Navigation**: Responsive sidebar with role-based menu options
- **Theming**: Light/dark mode support with CSS custom properties

## Data Flow

1. **Authentication Flow**: Users authenticate via Replit OAuth, sessions stored in PostgreSQL
2. **Data Ingestion**: Files uploaded through drag-and-drop interface, processed server-side
3. **Data Processing**: Raw data mapped to standardized schema with AI assistance
4. **Risk Analysis**: Processed data analyzed for exposure, geographic distribution, and risk metrics
5. **Visualization**: Results displayed through interactive maps, charts, and tables
6. **Export**: Processed insights exported to external BI tools or downloaded as files

## External Dependencies

### Core Infrastructure
- **Database**: Neon PostgreSQL serverless
- **Authentication**: Replit OAuth service
- **Frontend Build**: Vite with React plugin
- **UI Components**: Radix UI primitives with shadcn/ui styling

### Data Visualization
- **Maps**: Leaflet for interactive geospatial visualization
- **Charts**: Recharts for data visualization and analytics
- **File Handling**: React Dropzone for file upload UX

### Development Tools
- **Type Safety**: TypeScript across frontend and backend
- **Database**: Drizzle Kit for migrations and schema management
- **Code Quality**: ESLint integration through Vite
- **Development**: Hot module replacement and error overlay

## Deployment Strategy

### Production Build
- **Frontend**: Vite builds React application to static assets
- **Backend**: esbuild bundles Node.js server with external dependencies
- **Database**: Drizzle migrations applied via `db:push` command

### Environment Configuration
- **Development**: `npm run dev` with hot reloading and development middleware
- **Production**: `npm run build` followed by `npm start`
- **Database**: Environment variable `DATABASE_URL` required for PostgreSQL connection

### Hosting Requirements
- Node.js runtime environment
- PostgreSQL database (Neon serverless recommended)
- Environment variables for database connection and session secrets
- Support for WebSocket connections (for real-time features if added)

The application follows a modular architecture with clear separation between frontend React components, backend API routes, and database operations, making it maintainable and scalable for enterprise insurance workflows.