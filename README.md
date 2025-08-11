# Gunsmith Barrel Safety Factor Calculator

A professional web-based tool for thick-walled cylinder stress analysis, specifically designed for firearm barrel safety factor calculations.

## Features

- **Thick-walled cylinder stress analysis** using Lamé equations
- **Safety factor calculations** with Von Mises stress criteria
- **Compound cylinder analysis** for trunnion-reinforced barrels
- **Material database** with common barrel steels
- **Cartridge database** with chamber specifications
- **Interactive charts** showing stress distributions
- **PDF report generation** for professional documentation
- **Offline capability** with Progressive Web App support
- **Accessibility compliant** (WCAG 2.1 AA)

## Technology Stack

- **Frontend**: Vanilla HTML5, CSS3, JavaScript ES6+ modules
- **UI Framework**: Bootstrap 5.3.0
- **Charts**: Chart.js v4.4.0
- **Deployment**: GitHub Pages with GitHub Actions
- **No build process**: Zero-runtime dependencies

## Quick Start

1. Visit the live application: [https://gunsmiss.github.io/](https://gunsmiss.github.io/)
2. Enter barrel dimensions (inner/outer diameter)
3. Specify internal pressure and material properties
4. Review calculated safety factors and stress analysis
5. Generate PDF reports for documentation

## Development

This project uses vanilla web technologies with no build process required:

```bash
# Clone the repository
git clone https://github.com/gunsmiss/gunsmiss.github.io.git

# Serve locally (optional)
python -m http.server 8000
# or
npx serve .

# Open in browser
open http://localhost:8000
```

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and development process.

## Safety Disclaimer

⚠️ **IMPORTANT**: This calculator is for educational and professional reference only. All calculations should be independently verified by qualified engineers. Users must ensure compliance with applicable safety standards and regulations. See [SECURITY.md](SECURITY.md) for full disclaimers.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

- Email: gunsmiss@proton.me
- Issues: [GitHub Issues](https://github.com/gunsmiss/gunsmiss.github.io/issues)
