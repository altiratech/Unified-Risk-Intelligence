# Risk Intelligence Platform

## Overview

This is an insurance risk intelligence platform built as a full-stack web application that consolidates fragmented data sources into a unified dashboard. The application is designed for insurance carriers, reinsurers, MGAs, and risk consultants to assess, visualize, and manage risk exposure data across multiple channels.

## Recent Changes (August 1, 2025)

### Tomorrow.io Weather Layer Integration (Latest - August 1, 2025)
- **Implemented Tomorrow.io API integration** with new backend endpoint `/api/weather-layers/temperature` and `/api/weather-layers/wind`
- **Created authentic weather data fetching** from Tomorrow.io API for real-time temperature and wind data across 8 geographic locations
- **Replaced static OpenWeatherMap tiles** with dynamic GeoJSON-based weather overlays using Tomorrow.io data
- **Added temperature heatmap visualization** with color-coded intensity mapping (blue to red temperature scale)
- **Implemented wind pattern circles** with size and color based on real wind speed data from Tomorrow.io
- **Enhanced weather layer controls** with debugging output and proper toggle functionality
- **Weather layers now display authentic data** from Tomorrow.io API instead of placeholder or mock data
- **Issue identified**: Map readiness timing causing "Cannot add weather layers - map not ready" errors requiring optimization

### Fixed Application Startup and Preview Navigation
- **Fixed critical syntax errors** causing app build failures: removed .tsx extension from import statements and fixed missing JSX closing tags
- **Removed authentication-based routing restrictions** allowing full preview access to all application pages without forced login redirects
- **Updated Landing page navigation** to use proper routing links instead of authentication API redirects
- **Enabled preview mode access** for Dashboard (/dashboard), Data Sources (/data-sources), and Geospatial View (/geospatial) pages
- **Maintained AuthWrapper functionality** with showLoginPrompt={false} for graceful preview experience
- **Application now runs successfully** with Express server on port 5000 and full navigation capabilities

### Previous Authentication Navigation Work
- **Resolved preview navigation issues** by creating AuthWrapper component that prevents forced login redirects
- **Updated authentication handling** in dashboard and data sources pages to work gracefully in preview mode
- **Implemented flexible authentication flow** that shows login prompts without breaking navigation
- **Enhanced useAuth hook** with better retry logic and error handling for preview environments
- **Added graceful fallback behavior** allowing users to preview the application functionality without authentication barriers

## Previous Changes (January 31, 2025)

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

### Predictive Risk Trend Animation System (Latest)
- **Implemented forecast data fetching** with Tomorrow.io API for 72-hour weather predictions
- **Created temporal animation framework** with 3-hour interval data points (24 total frames)
- **Built comprehensive animation controls** with play/pause, frame stepping, and speed adjustment
- **Added dynamic timeline display** showing current timestamp and frame position
- **Integrated animated risk visualization** with color-coded circles updating in real-time
- **Implemented progress tracking** with visual progress bar and frame counter
- **Enhanced API endpoints** with `/api/weather-risk/animation` for forecast data generation
- **Added interactive popup displays** showing time-specific weather and risk data for each frame
- **Created predictive risk scoring** that evolves over time based on changing weather patterns

## Development Roadmap & Missing Components

### Priority 1: Core Risk Analytics Engine
**Status: Partially Implemented**

**Missing Components:**
- **Portfolio Analysis Engine**: Advanced risk aggregation and correlation analysis
- **PML (Probable Maximum Loss) Calculator**: Industry-standard catastrophe modeling
- **AAL (Average Annual Loss) Estimator**: Long-term loss projections
- **Risk Concentration Analysis**: Geographic and peril-based clustering detection
- **Stress Testing Module**: Scenario analysis and what-if modeling

**Implementation Needs:**
- Advanced statistical algorithms for risk calculations
- Integration with catastrophe modeling vendors (RMS, AIR, KatRisk)
- Real-time risk metric updates based on portfolio changes
- Configurable risk tolerance thresholds and alerts

### Priority 2: AI-Powered Data Processing Pipeline
**Status: Framework Only**

**Missing Components:**
- **Smart Data Mapping**: ML-based field recognition and mapping suggestions
- **Data Quality Scoring**: Automated data validation and completeness assessment
- **Anomaly Detection**: Outlier identification in risk exposure data
- **Auto-Classification**: Peril type and risk category prediction
- **Data Enrichment**: External data source integration (demographics, property details)

**Implementation Needs:**
- Machine learning models for data classification
- Real-time data validation rules engine
- Integration with external APIs (Zesty.ai, CoreLogic, etc.)
- Automated data cleansing workflows

### Priority 3: Advanced Reporting & Analytics
**Status: Basic Dashboard Only**

**Missing Components:**
- **Executive Dashboards**: C-suite focused KPI summaries
- **Regulatory Reports**: NAIC, Solvency II, and other compliance reports
- **Custom Report Builder**: Drag-and-drop report creation interface
- **Scheduled Reports**: Automated report generation and distribution
- **Interactive Visualizations**: Advanced charts, heat maps, and drill-down capabilities
- **Benchmark Analysis**: Industry comparison and peer analysis

**Implementation Needs:**
- Report template engine with PDF/Excel export
- Advanced charting library integration (D3.js, Observable Plot)
- Email notification system for scheduled reports
- Role-based access controls for sensitive reports

### Priority 4: Real-Time Risk Monitoring
**Status: Weather Integration Only**

**Missing Components:**
- **Multi-Peril Monitoring**: Earthquake, flood, cyber threat, wildfire tracking
- **Portfolio Alerts System**: Real-time notifications for risk threshold breaches
- **Event Response Dashboard**: Catastrophe event impact assessment
- **Claims Correlation**: Link claims data to risk exposures
- **Dynamic Risk Scoring**: Real-time risk score updates based on external events

**Implementation Needs:**
- Event streaming architecture (WebSockets, SSE)
- Integration with multiple external risk data providers
- Alert management system with escalation rules
- Mobile-responsive notifications

### Priority 5: Advanced Integration Platform
**Status: Basic API Structure**

**Missing Components:**
- **Third-Party Connectors**: Pre-built integrations with major insurtech platforms
- **API Gateway**: Rate limiting, authentication, and monitoring for external access
- **Webhook Management**: Event-driven integrations with external systems
- **Data Marketplace**: Access to premium risk data sources
- **Export Pipeline**: Integration with BI tools (Tableau, Power BI, Looker)

**Implementation Needs:**
- OAuth 2.0 API authentication system
- Connector marketplace with plug-and-play integrations
- Data transformation pipelines for various output formats
- API documentation and developer portal

### Priority 6: Enterprise Security & Compliance
**Status: Basic Authentication Only**

**Missing Components:**
- **Multi-Factor Authentication**: Enhanced security for sensitive operations
- **Audit Trail**: Comprehensive logging of all user actions and data changes
- **Data Encryption**: End-to-end encryption for sensitive risk data
- **Access Control Matrix**: Granular permissions for different user roles
- **Compliance Framework**: SOC 2, ISO 27001, GDPR compliance tools

**Implementation Needs:**
- Identity management system with SSO support
- Comprehensive audit logging with tamper protection
- Data classification and protection policies
- Compliance monitoring and reporting tools

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