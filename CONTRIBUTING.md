# Contributing to StellarCollab

Thank you for your interest in contributing to StellarCollab! We welcome contributions from the community and are excited to work with you.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Contribution Types](#contribution-types)
- [Coding Standards](#coding-standards)
- [Submitting Changes](#submitting-changes)
- [Legal Requirements](#legal-requirements)

## 🤝 Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:

- **Be Respectful**: Treat everyone with respect and kindness
- **Be Inclusive**: Welcome people of all backgrounds and experience levels
- **Be Constructive**: Provide helpful feedback and suggestions
- **Be Professional**: Maintain a professional tone in all communications
- **Be Patient**: Remember that everyone is learning and growing

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- PostgreSQL 13+
- Redis 6+
- Docker & Docker Compose
- Git

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/stellarcollab.git
   cd stellarcollab
   ```

2. **Set up Development Environment**
   ```bash
   # Backend
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   
   # Database
   docker-compose up -d db redis
   alembic upgrade head
   ```

3. **Run Tests**
   ```bash
   pytest
   ```

4. **Start Development Server**
   ```bash
   # Backend
   uvicorn app.main:app --reload
   
   # Frontend (separate terminal)
   cd frontend
   python -m http.server 3000
   ```

## 🔄 Development Process

### Branching Strategy

- **main**: Production-ready code
- **develop**: Integration branch for features
- **feature/**: New features (`feature/canvas-layers`)
- **bugfix/**: Bug fixes (`bugfix/tile-lock-issue`)
- **hotfix/**: Critical production fixes

### Workflow

1. Create a feature branch from `develop`
2. Make your changes
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request to `develop`

## 🛠️ Contribution Types

### 🐛 Bug Reports

When reporting bugs, please include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Browser/OS information
- Screenshots if applicable

### ✨ Feature Requests

For new features, please provide:
- Clear description of the feature
- Use case and benefits
- Potential implementation approach
- Mockups or wireframes (if UI-related)

### 💻 Code Contributions

We welcome contributions for:
- Bug fixes
- New features
- Performance improvements
- Documentation updates
- Test coverage improvements

### 📚 Documentation

Help improve our documentation:
- API documentation
- User guides
- Developer documentation
- Code comments
- README improvements

## 📝 Coding Standards

### Python (Backend)

```python
# Use type hints
def create_tile(db: Session, tile_data: TileCreate) -> Tile:
    """Create a new tile with validation."""
    pass

# Follow PEP 8
class TileManager:
    """Manages tile operations."""
    
    def __init__(self, db_session: Session):
        self.db = db_session
```

### JavaScript (Frontend)

```javascript
// Use modern ES6+ features
class CanvasManager {
    /**
     * Initialize canvas manager
     * @param {HTMLCanvasElement} canvas - Canvas element
     */
    constructor(canvas) {
        this.canvas = canvas;
    }
    
    // Use descriptive method names
    async loadCanvasData(canvasId) {
        // Implementation
    }
}

// Use const/let, not var
const API_BASE_URL = 'https://api.stellarcollab.com';
```

### CSS

```css
/* Use CSS custom properties */
:root {
    --primary-color: #6366f1;
    --border-radius: 8px;
}

/* Use BEM methodology */
.canvas-editor {
    /* Block */
}

.canvas-editor__toolbar {
    /* Element */
}

.canvas-editor__toolbar--hidden {
    /* Modifier */
}
```

### General Guidelines

- **Comments**: Write clear, helpful comments
- **Naming**: Use descriptive names for variables and functions
- **Functions**: Keep functions small and focused
- **Error Handling**: Always handle errors gracefully
- **Security**: Never commit sensitive information

## 📤 Submitting Changes

### Pull Request Process

1. **Create Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Write clean, well-documented code
   - Add tests for new functionality
   - Update documentation as needed

3. **Test Your Changes**
   ```bash
   # Run backend tests
   cd backend
   pytest
   
   # Run frontend tests (if applicable)
   cd frontend
   npm test
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add canvas layer functionality"
   ```

   Use conventional commit messages:
   - `feat:` - New features
   - `fix:` - Bug fixes
   - `docs:` - Documentation changes
   - `style:` - Code style changes
   - `refactor:` - Code refactoring
   - `test:` - Adding tests
   - `chore:` - Maintenance tasks

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

### Pull Request Template

When creating a PR, please include:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement

## Testing
- [ ] Tests pass locally
- [ ] Added tests for new functionality
- [ ] Manual testing completed

## Screenshots (if applicable)
Add screenshots of UI changes

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

## ⚖️ Legal Requirements

### Contributor License Agreement

By contributing to StellarCollab, you agree that:

1. **Original Work**: Your contributions are your original work
2. **License Grant**: You grant StellarCollab rights to use your contributions
3. **No Conflicts**: Your contributions don't violate any agreements
4. **Compliance**: You comply with all applicable laws

### Copyright

- All contributions become part of StellarCollab's codebase
- Original copyright notices must be preserved
- New files should include appropriate copyright headers

### Code of Conduct Enforcement

Violations of our Code of Conduct may result in:
- Warning and guidance
- Temporary suspension from the project
- Permanent ban from the community

## 🎉 Recognition

Contributors will be recognized:
- In our CONTRIBUTORS.md file
- In release notes for significant contributions
- On our website (with permission)
- In our annual contributor appreciation

## 📞 Questions?

Need help getting started?

- **Discord**: [Join our community](https://discord.gg/stellarcollab)
- **Email**: developers@artparty.social
- **Documentation**: Check our [wiki](https://github.com/stellarcollab/wiki)

Thank you for contributing to StellarCollab! 🎨✨

---

Copyright (c) 2025 StellarCollab. All rights reserved.
