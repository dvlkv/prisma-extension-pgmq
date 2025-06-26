# Contributing to Prisma PGMQ

Thank you for your interest in contributing to Prisma PGMQ! This document provides guidelines and information for contributors.

## Development Setup

### Prerequisites

- Node.js 16+ 
- pnpm (recommended package manager)
- PostgreSQL with PGMQ extension installed
- Git

### Getting Started

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/your-username/prisma-extension-pgmq.git
   cd prisma-extension-pgmq
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Generate Prisma client:**
   ```bash
   npx prisma generate
   ```

4. **Build the project:**
   ```bash
   pnpm build
   ```

5. **Run tests:**
   ```bash
   # Unit tests (no database required)
   pnpm test:unit
   
   # Integration tests (requires database)
   pnpm test:db
   
   # All tests
   pnpm test
   ```

## Development Workflow

### Project Structure

```
src/
├── pgmq.ts           # Core PGMQ function implementations
├── client.ts         # PrismaPGMQ class wrapper
├── index.ts          # Main entry point and exports
└── __tests__/
    ├── setup.ts      # Test setup configuration
    ├── mocks/        # Mock utilities for testing
    ├── unit/         # Unit tests with mocks
    └── integration/  # Integration tests with real database
```

### Code Style

- **TypeScript**: Use strict TypeScript with proper type annotations
- **ESLint**: Follow the configured ESLint rules (`pnpm lint`)
- **Formatting**: Code is automatically formatted (consider adding Prettier)
- **Naming**: Use descriptive names and follow JavaScript/TypeScript conventions

### Testing

We use a two-tier testing approach:

#### Unit Tests
- Located in `src/__tests__/unit/`
- Use mocks to test query generation and logic without database
- Run with `pnpm test:unit`
- Should be fast and reliable

#### Integration Tests
- Located in `src/__tests__/integration/`
- Test against real PostgreSQL database with PGMQ
- Run with `pnpm test:db`
- Require proper database setup

### Database Setup for Integration Tests

1. **Install PostgreSQL and PGMQ:**
   ```sql
   CREATE EXTENSION IF NOT EXISTS pgmq;
   ```

2. **Set environment variable:**
   ```bash
   export DATABASE_URL="postgresql://username:password@localhost:5432/test_db"
   ```

3. **Run integration tests:**
   ```bash
   pnpm test:db
   ```

## Making Changes

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
```

### 2. Write Code

- Write clear, well-documented code
- Add appropriate type annotations
- Follow existing patterns and conventions
- Consider backward compatibility

### 3. Add Tests

- **Unit tests** for new functions or logic changes
- **Integration tests** for new PGMQ operations
- Ensure good test coverage

### 4. Update Documentation

- Update README.md if adding new features
- Add JSDoc comments for new public APIs
- Update examples if relevant

### 5. Commit Changes

Follow conventional commit format:

```bash
git commit -m "feat: add support for delayed message scheduling"
git commit -m "fix: handle undefined results in metrics function"
git commit -m "docs: update API documentation for sendBatch"
```

Commit types:
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `test`: Test additions or modifications
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `chore`: Maintenance tasks

## Pull Request Process

1. **Ensure all tests pass:**
   ```bash
   pnpm test
   pnpm lint
   pnpm build
   ```

2. **Create pull request:**
   - Use a clear, descriptive title
   - Include detailed description of changes
   - Reference any related issues
   - Add screenshots/examples if relevant

3. **Pull request template:**
   ```markdown
   ## Description
   Brief description of changes

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update

   ## Testing
   - [ ] Unit tests pass
   - [ ] Integration tests pass
   - [ ] Manual testing completed

   ## Checklist
   - [ ] Code follows style guidelines
   - [ ] Self-review completed
   - [ ] Documentation updated
   - [ ] Tests added/updated
   ```

## Code Review Guidelines

### For Authors
- Keep PRs focused and reasonably sized
- Respond to feedback promptly
- Be open to suggestions and improvements

### For Reviewers
- Be constructive and helpful
- Focus on code quality, correctness, and maintainability
- Test the changes locally when possible

## Adding New Features

### New PGMQ Functions

1. **Add function to `src/pgmq.ts`:**
   ```typescript
   export async function newFunction(
     tx: Prisma.TransactionClient,
     param1: string,
     param2: number
   ): Promise<ReturnType> {
     const result = await tx.$queryRaw`SELECT pgmq.new_function(${param1}, ${param2})`;
     // Handle result safely
     return result;
   }
   ```

2. **Add wrapper method to `PrismaPGMQ` class in `src/client.ts`**

3. **Add unit tests in `src/__tests__/unit/`**

4. **Add integration tests in `src/__tests__/integration/`**

5. **Update documentation and examples**

### Breaking Changes

Breaking changes require special consideration:

1. **Discuss in an issue first**
2. **Provide migration guide**
3. **Update major version**
4. **Clearly document changes**

## Performance Considerations

- **Efficient queries**: Ensure generated SQL is optimal
- **Transaction usage**: Group related operations appropriately
- **Memory usage**: Handle large result sets carefully
- **Connection pooling**: Don't hold connections unnecessarily

## Error Handling

- **Meaningful errors**: Provide helpful error messages
- **Consistent patterns**: Follow existing error handling approaches
- **Documentation**: Document error conditions in JSDoc

## Security

- **SQL injection**: Use parameterized queries (Prisma handles this)
- **Input validation**: Validate function parameters appropriately
- **Sensitive data**: Don't log sensitive information

## Release Process

1. **Update version** in `package.json`
2. **Update CHANGELOG.md** with changes
3. **Create release tag**: `git tag v1.0.0`
4. **Push changes**: `git push origin main --tags`
5. **Publish to npm**: `pnpm publish`

## Getting Help

- **Issues**: Open GitHub issues for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions
- **Documentation**: Check README.md and code comments

## Community Guidelines

- Be respectful and inclusive
- Help others learn and contribute
- Follow code of conduct
- Share knowledge and best practices

Thank you for contributing to Prisma PGMQ! 🎉