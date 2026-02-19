# GitHub Copilot Instructions for Bookster

## Project Overview

Bookster is a NestJS-based microservices application for managing books and authentication. The project uses a monorepo structure with multiple applications and shared libraries.

## Project Structure

- **apps/**: Contains microservices applications
  - `gateway/`: API Gateway service
  - `auth/`: Authentication service
  - `books/`: Books management service
- **libs/**: Shared libraries
  - `common/`: Common utilities and shared code
- **prisma/**: Database schema and migrations
- **proto/**: Protocol buffer definitions for gRPC communication

## Technology Stack

- **Framework**: NestJS (Node.js framework)
- **Language**: TypeScript
- **Package Manager**: pnpm
- **Database**: Prisma ORM
- **Communication**: gRPC (@grpc/grpc-js, @grpc/proto-loader)
- **Authentication**: JWT (@nestjs/jwt, passport-jwt, argon2)
- **Search**: Meilisearch
- **Testing**: Jest
- **Linting**: ESLint
- **Formatting**: Prettier

## Coding Guidelines

### General Principles

1. **Follow NestJS conventions**: Use decorators, dependency injection, and modular architecture
2. **TypeScript strict mode**: Ensure type safety throughout the codebase
3. **Microservices pattern**: Keep services decoupled and communicate via gRPC
4. **Shared code**: Place reusable code in `libs/common`

### Code Style

- Use Prettier for formatting (config in `.prettierrc`)
- Follow ESLint rules (config in `eslint.config.mjs`)
- Use meaningful variable and function names
- Add JSDoc comments for public APIs and complex logic

### NestJS Patterns

- Use `@Injectable()` for services
- Use `@Controller()` for HTTP controllers
- Use proper module organization with `@Module()` decorators
- Implement DTOs (Data Transfer Objects) for input validation
- Use `@nestjs/mapped-types` for DTO transformations

### Authentication & Security

- Hash passwords using argon2
- Use JWT for authentication
- Implement proper guards for route protection
- Never expose sensitive data in responses

### Database

- Define models in Prisma schema
- Use migrations for schema changes
- Keep database logic in services
- Use transactions when needed

### Testing

- Write unit tests for services and controllers
- Write E2E tests for critical user flows
- Aim for meaningful test coverage
- Use Jest's mocking capabilities

## Common Commands

```bash
# Install dependencies
pnpm install

# Development
pnpm run start:dev

# Build
pnpm run build

# Lint
pnpm run lint

# Format
pnpm run format

# Test
pnpm run test
pnpm run test:e2e
pnpm run test:cov
```

## Module Creation

When creating new modules:
1. Generate using NestJS CLI: `nest g module <name>`
2. Keep module-specific code within the module directory
3. Export only necessary providers
4. Import required modules

## API Development

- Use DTOs for request validation
- Use proper HTTP status codes
- Handle errors with NestJS exception filters
- Document endpoints with comments or Swagger decorators

## Microservices Communication

- Define gRPC services in `.proto` files
- Use ts-proto for TypeScript generation
- Handle gRPC errors appropriately
- Keep inter-service communication efficient

## Best Practices

1. **Dependency Injection**: Always use DI for better testability
2. **Error Handling**: Use NestJS built-in exception filters
3. **Validation**: Use class-validator for DTO validation
4. **Environment Config**: Use @nestjs/config for configuration
5. **Logging**: Use NestJS Logger for consistent logging
6. **Documentation**: Keep README and code comments up to date
