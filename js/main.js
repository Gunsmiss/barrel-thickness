/**
 * Gunsmith Barrel Safety Factor Calculator
 * Main application entry point
 */

// Application initialization
document.addEventListener('DOMContentLoaded', function() {
    console.log('Gunsmith Barrel SF Calculator - Initializing...');
    
    // Initialize the application
    initializeApp();
});

/**
 * Initialize the main application
 */
function initializeApp() {
    try {
        // Clear loading indicators
        clearLoadingStates();
        
        // Initialize form
        initializeInputForm();
        
        // Initialize mobile offcanvas
        initializeMobileOffcanvas();
        
        // Set up event listeners
        setupEventListeners();
        
        console.log('Application initialized successfully');
    } catch (error) {
        console.error('Error initializing application:', error);
        showError('Failed to initialize application. Please refresh the page.');
    }
}

/**
 * Clear loading states from the interface
 */
function clearLoadingStates() {
    const loadingElements = document.querySelectorAll('.spinner-border');
    loadingElements.forEach(element => {
        element.parentElement.innerHTML = '<p class="text-muted">Ready for input</p>';
    });
}

/**
 * Initialize the input form
 */
function initializeInputForm() {
    const inputForm = document.getElementById('input-form');
    
    inputForm.innerHTML = `
        <form id="calculation-form">
            <div class="mb-3">
                <label for="inner-diameter" class="form-label">Inner Diameter (inches)</label>
                <input type="number" class="form-control" id="inner-diameter" 
                       step="0.001" min="0.1" max="2.0" 
                       placeholder="0.308" 
                       aria-describedby="inner-diameter-help">
                <div id="inner-diameter-help" class="form-text">
                    Bore diameter of the barrel
                </div>
            </div>
            
            <div class="mb-3">
                <label for="outer-diameter" class="form-label">Outer Diameter (inches)</label>
                <input type="number" class="form-control" id="outer-diameter" 
                       step="0.001" min="0.5" max="4.0" 
                       placeholder="0.750"
                       aria-describedby="outer-diameter-help">
                <div id="outer-diameter-help" class="form-text">
                    Outside diameter of the barrel
                </div>
            </div>
            
            <div class="mb-3">
                <label for="pressure" class="form-label">Internal Pressure (psi)</label>
                <input type="number" class="form-control" id="pressure" 
                       step="100" min="1000" max="100000" 
                       placeholder="55000"
                       aria-describedby="pressure-help">
                <div id="pressure-help" class="form-text">
                    Maximum expected chamber pressure
                </div>
            </div>
            
            <div class="mb-3">
                <label for="yield-strength" class="form-label">Material Yield Strength (psi)</label>
                <input type="number" class="form-control" id="yield-strength" 
                       step="1000" min="30000" max="300000" 
                       placeholder="120000"
                       aria-describedby="yield-help">
                <div id="yield-help" class="form-text">
                    Material yield strength (steel: ~120,000 psi typical)
                </div>
            </div>
            
            <button type="submit" class="btn btn-primary w-100">
                Calculate Safety Factor
            </button>
        </form>
    `;
}

/**
 * Initialize mobile offcanvas functionality
 */
function initializeMobileOffcanvas() {
    const mobileInputForm = document.getElementById('mobile-input-form');
    if (mobileInputForm) {
        // Copy the main form to mobile offcanvas
        mobileInputForm.innerHTML = '<p class="text-muted">Form will sync with main panel</p>';
    }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    const form = document.getElementById('calculation-form');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
    
    // Unit toggle functionality
    setupUnitToggle();
}

/**
 * Set up unit toggle functionality
 */
function setupUnitToggle() {
    const unitDropdownItems = document.querySelectorAll('[data-unit]');
    const currentUnitSpan = document.getElementById('currentUnit');
    
    unitDropdownItems.forEach(item => {
        item.addEventListener('click', function() {
            const selectedUnit = this.getAttribute('data-unit');
            const unitText = selectedUnit === 'imperial' ? 'Imperial' : 'Metric';
            
            if (currentUnitSpan) {
                currentUnitSpan.textContent = unitText;
            }
            
            // Update form labels and placeholders based on unit system
            updateFormUnits(selectedUnit);
            
            console.log(`Unit system changed to: ${unitText}`);
        });
    });
}

/**
 * Update form units based on selected system
 */
function updateFormUnits(unitSystem) {
    const form = document.getElementById('calculation-form');
    if (!form) return;
    
    if (unitSystem === 'metric') {
        // Update to metric units
        updateFormField('inner-diameter', 'Inner Diameter (mm)', '7.82', 'Bore diameter of the barrel');
        updateFormField('outer-diameter', 'Outer Diameter (mm)', '19.05', 'Outside diameter of the barrel');
        updateFormField('pressure', 'Internal Pressure (MPa)', '380', 'Maximum expected chamber pressure');
        updateFormField('yield-strength', 'Material Yield Strength (MPa)', '827', 'Material yield strength (steel: ~827 MPa typical)');
    } else {
        // Update to imperial units
        updateFormField('inner-diameter', 'Inner Diameter (inches)', '0.308', 'Bore diameter of the barrel');
        updateFormField('outer-diameter', 'Outer Diameter (inches)', '0.750', 'Outside diameter of the barrel');
        updateFormField('pressure', 'Internal Pressure (psi)', '55000', 'Maximum expected chamber pressure');
        updateFormField('yield-strength', 'Material Yield Strength (psi)', '120000', 'Material yield strength (steel: ~120,000 psi typical)');
    }
}

/**
 * Update individual form field labels and placeholders
 */
function updateFormField(fieldId, label, placeholder, helpText) {
    const field = document.getElementById(fieldId);
    const labelElement = document.querySelector(`label[for="${fieldId}"]`);
    const helpElement = document.getElementById(`${fieldId}-help`);
    
    if (labelElement) labelElement.textContent = label;
    if (field) field.placeholder = placeholder;
    if (helpElement) helpElement.textContent = helpText;
}

/**
 * Handle form submission
 */
function handleFormSubmit(event) {
    event.preventDefault();
    
    console.log('Form submitted - calculation will be implemented in future tasks');
    
    // Show placeholder results
    const resultsDisplay = document.getElementById('results-display');
    resultsDisplay.innerHTML = `
        <div class="alert alert-info" role="alert">
            <h6 class="alert-heading">Calculation Engine</h6>
            <p class="mb-0">
                Form validation successful. Calculation engine will be implemented in Task 5.
                This demonstrates the basic structure and input validation.
            </p>
        </div>
    `;
    
    // Show placeholder charts
    const chartsDisplay = document.getElementById('charts-display');
    chartsDisplay.innerHTML = `
        <div class="alert alert-info" role="alert">
            <h6 class="alert-heading">Analysis Charts</h6>
            <p class="mb-0">
                Stress distribution charts will be implemented in Task 12 using Chart.js.
            </p>
        </div>
    `;
}

/**
 * Show error message
 */
function showError(message) {
    const alertHtml = `
        <div class="alert alert-danger alert-dismissible fade show" role="alert">
            <strong>Error:</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    
    // Add to the top of the page
    const container = document.querySelector('.container-fluid');
    container.insertAdjacentHTML('afterbegin', alertHtml);
}

// Export for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeApp,
        handleFormSubmit
    };
}
