# PRD: Architecture Refactor for Simplified Development & Deployment

## Introduction/Overview

The current Artparty.social has become complex with multiple ports, CORS conflicts, and confusing proxy configurations that make local development and production deployments error-prone. This refactor will simplify the architecture while maintaining functionality, enabling smooth weekly production deployments with reliable local testing.

## Goals

1. **Simplify Local Development**: Single port (3000) for all services with no proxy complexity
2. **Eliminate CORS Issues**: Remove nginx CORS handling, let FastAPI handle it properly
3. **Streamline Deployment**: Automated weekly deployments with zero-downtime
4. **Improve Developer Experience**: Hot-reload, clear error messages, easy debugging
5. **Maintain Production Performance**: Keep nginx for production while simplifying local dev

## User Stories

1. **As a solo developer**, I want to start the entire application with one command so that I can focus on coding instead of configuration
2. **As a developer**, I want to see clear error messages when API calls fail so that I can debug issues quickly
3. **As a developer**, I want to make changes and see them immediately without restarting services
4. **As a developer**, I want to deploy to production with confidence knowing the local environment matches production
5. **As a developer**, I want to test new features locally before they affect production users

## Functional Requirements

1. **Single Port Development**: All services (frontend, API, WebSocket) accessible on localhost:3000
2. **FastAPI Static File Serving**: Replace nginx proxy with FastAPI's built-in static file serving for local development
3. **Unified CORS Configuration**: Single source of CORS configuration in FastAPI backend
4. **Environment-Specific Configs**: Clear separation between local, staging, and production configurations
5. **Hot-Reload Support**: Backend auto-reload on code changes, frontend auto-refresh on file changes
6. **Automated Deployment Pipeline**: Weekly automated deployments with rollback capability
7. **Health Check Endpoints**: Comprehensive health checks for all services
8. **Logging Standardization**: Consistent logging format across all services
9. **Error Handling**: Clear error messages and proper HTTP status codes
10. **Database Migration System**: Automated database schema updates during deployment

## Non-Goals (Out of Scope)

- Changing the core technology stack (FastAPI, HTML/JS frontend)
- Adding complex microservices architecture
- Implementing Kubernetes or complex orchestration
- Adding user authentication features (keep existing)
- Changing the database structure or models

## Design Considerations

### Local Development Architecture
```
localhost:3000
├── / (frontend static files served by FastAPI)
├── /api/v1/* (FastAPI endpoints)
├── /ws (WebSocket connections)
└── /health (health check endpoint)
```

### Production Architecture (Unchanged)
```
nginx (port 80/443)
├── / (frontend static files)
├── /api/* (proxy to FastAPI backend)
└── /ws (proxy to WebSocket)
```

### Environment Configuration
- **Local**: Single FastAPI server with static file serving
- **Staging**: Docker Compose with nginx (for testing production-like setup)
- **Production**: Current nginx + FastAPI setup (unchanged)

## Technical Considerations

### FastAPI Static File Serving
- Use `StaticFiles` from FastAPI for local development
- Configure proper MIME types and caching headers
- Handle SPA routing (fallback to index.html)

### CORS Configuration
- Single CORS configuration in FastAPI
- Environment-specific allowed origins
- Proper preflight request handling

### Database Migrations
- Use Alembic for database migrations
- Automated migration application during deployment
- Rollback capability for failed migrations

### Deployment Pipeline
- GitHub Actions for CI/CD
- Automated testing before deployment
- Blue-green deployment strategy
- Health check validation before traffic switch

## Success Metrics

1. **Development Speed**: Reduce local setup time from 10+ minutes to <2 minutes
2. **Error Reduction**: Eliminate 90% of CORS and port-related issues
3. **Deployment Reliability**: Achieve 99% successful deployments
4. **Developer Satisfaction**: Single command to start development environment
5. **Production Stability**: Zero downtime during weekly deployments

## Implementation Phases

### Phase 1: Local Development Simplification
- Implement FastAPI static file serving
- Remove nginx from local development
- Fix CORS configuration
- Add health check endpoints

### Phase 2: Environment Configuration
- Create environment-specific configuration files
- Implement proper logging
- Add database migration system
- Set up automated testing

### Phase 3: Deployment Automation
- Create GitHub Actions workflow
- Implement automated deployment pipeline
- Add rollback mechanisms
- Set up monitoring and alerting

### Phase 4: Production Optimization
- Optimize nginx configuration for production
- Implement caching strategies
- Add performance monitoring
- Document deployment procedures

## Open Questions

1. Should we implement a staging environment for testing before production?
2. Do we need to implement database backup strategies?
3. Should we add monitoring and alerting for production?
4. Do we need to implement rate limiting for the API?
5. Should we add API documentation (Swagger/OpenAPI) for better developer experience?

## Risk Assessment

### Low Risk
- FastAPI static file serving (well-documented feature)
- Environment configuration changes
- CORS configuration fixes

### Medium Risk
- Database migration system implementation
- Deployment pipeline automation
- Production nginx optimization

### Mitigation Strategies
- Incremental implementation with rollback capability
- Comprehensive testing at each phase
- Documentation of all changes
- Backup strategies for critical data 