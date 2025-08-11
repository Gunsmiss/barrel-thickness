/**
 * Gunsmith Barrel Safety Factor Calculator
 * Main application entry point
 */

import { setSystem, getSystem, convert, format, getCurrentUnits, fromSI, toSI } from './units.js';

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
        // Initialize units system first
        initializeUnitsSystem();
        
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
 * Initialize units system and UI
 */
function initializeUnitsSystem() {
    // Units system auto-initializes from localStorage
    const currentSystem = getSystem();
    
    // Update UI to reflect current system
    const currentUnitSpan = document.getElementById('currentUnit');
    if (currentUnitSpan) {
        currentUnitSpan.textContent = currentSystem === 'SI' ? 'Metric' : 'Imperial';
    }
    
    // Listen for unit system changes
    window.addEventListener('unitSystemChanged', handleUnitSystemChange);
    
    console.log(`Units system initialized: ${currentSystem}`);
}

/**
 * Handle unit system change events
 */
function handleUnitSystemChange(event) {
    const { newSystem, units } = event.detail;
    console.log(`Unit system changed to: ${newSystem}`, units);
    
    // Update UI display
    const currentUnitSpan = document.getElementById('currentUnit');
    if (currentUnitSpan) {
        currentUnitSpan.textContent = newSystem === 'SI' ? 'Metric' : 'Imperial';
    }
    
    // Update form with new units
    updateFormUnitsFromSystem();
    
    // Convert any existing values in the form
    convertExistingFormValues(event.detail.previousSystem, newSystem);
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
    
    // Generate form with current units
    inputForm.innerHTML = generateFormHTML();
}

/**
 * Generate form HTML based on current units
 */
function generateFormHTML() {
    const units = getCurrentUnits();
    const currentSystem = getSystem();
    
    // Define placeholder values and ranges based on system
    const config = currentSystem === 'SI' ? {
        innerDiameter: { placeholder: '7.82', min: '2.5', max: '50', step: '0.01' },
        outerDiameter: { placeholder: '19.05', min: '12.7', max: '100', step: '0.01' },
        pressure: { placeholder: '380', min: '7', max: '700', step: '1' },
        yieldStrength: { placeholder: '827', min: '200', max: '2000', step: '1' }
    } : {
        innerDiameter: { placeholder: '0.308', min: '0.1', max: '2.0', step: '0.001' },
        outerDiameter: { placeholder: '0.750', min: '0.5', max: '4.0', step: '0.001' },
        pressure: { placeholder: '55000', min: '1000', max: '100000', step: '100' },
        yieldStrength: { placeholder: '120', min: '30', max: '300', step: '1' }
    };
    
    return `
        <form id="calculation-form">
            <div class="mb-3">
                <label for="inner-diameter" class="form-label">Inner Diameter (${units.diameter})</label>
                <input type="number" class="form-control" id="inner-diameter" 
                       step="${config.innerDiameter.step}" 
                       min="${config.innerDiameter.min}" 
                       max="${config.innerDiameter.max}" 
                       placeholder="${config.innerDiameter.placeholder}" 
                       aria-describedby="inner-diameter-help">
                <div id="inner-diameter-help" class="form-text">
                    Bore diameter of the barrel
                </div>
            </div>
            
            <div class="mb-3">
                <label for="outer-diameter" class="form-label">Outer Diameter (${units.diameter})</label>
                <input type="number" class="form-control" id="outer-diameter" 
                       step="${config.outerDiameter.step}" 
                       min="${config.outerDiameter.min}" 
                       max="${config.outerDiameter.max}" 
                       placeholder="${config.outerDiameter.placeholder}"
                       aria-describedby="outer-diameter-help">
                <div id="outer-diameter-help" class="form-text">
                    Outside diameter of the barrel
                </div>
            </div>
            
            <div class="mb-3">
                <label for="pressure" class="form-label">Internal Pressure (${units.pressure})</label>
                <input type="number" class="form-control" id="pressure" 
                       step="${config.pressure.step}" 
                       min="${config.pressure.min}" 
                       max="${config.pressure.max}" 
                       placeholder="${config.pressure.placeholder}"
                       aria-describedby="pressure-help">
                <div id="pressure-help" class="form-text">
                    Maximum expected chamber pressure
                </div>
            </div>
            
            <div class="mb-3">
                <label for="yield-strength" class="form-label">Material Yield Strength (${units.stress})</label>
                <input type="number" class="form-control" id="yield-strength" 
                       step="${config.yieldStrength.step}" 
                       min="${config.yieldStrength.min}" 
                       max="${config.yieldStrength.max}" 
                       placeholder="${config.yieldStrength.placeholder}"
                       aria-describedby="yield-help">
                <div id="yield-help" class="form-text">
                    Material yield strength (steel: ${currentSystem === 'SI' ? '~827 MPa' : '~120 ksi'} typical)
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
        mobileInputForm.innerHTML = generateFormHTML();
        
        // Ensure mobile form has unique IDs and syncs with main form
        const mobileForm = mobileInputForm.querySelector('form');
        if (mobileForm) {
            mobileForm.id = 'mobile-calculation-form';
            mobileForm.addEventListener('submit', handleFormSubmit);
            
            // Sync input changes between mobile and desktop forms
            const mobileInputs = mobileForm.querySelectorAll('input');
            mobileInputs.forEach(input => {
                const originalId = input.id;
                input.id = `mobile-${originalId}`;
                
                // Sync changes to main form
                input.addEventListener('input', function() {
                    const mainInput = document.getElementById(originalId);
                    if (mainInput) {
                        mainInput.value = this.value;
                    }
                });
            });
        }
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
    
    unitDropdownItems.forEach(item => {
        item.addEventListener('click', function() {
            const selectedUnit = this.getAttribute('data-unit');
            const systemCode = selectedUnit === 'imperial' ? 'IP' : 'SI';
            
            // Use units module to change system (this will emit the event)
            setSystem(systemCode);
        });
    });
}

/**
 * Update form units based on current system (triggered by event)
 */
function updateFormUnitsFromSystem() {
    // Regenerate the entire form with proper event listeners
    const inputForm = document.getElementById('input-form');
    if (inputForm) {
        inputForm.innerHTML = generateFormHTML();
        
        // Re-attach form event listeners
        const form = document.getElementById('calculation-form');
        if (form) {
            form.addEventListener('submit', handleFormSubmit);
        }
    }
    
    // Update mobile form too
    initializeMobileOffcanvas();
}

/**
 * Convert existing form values when unit system changes
 */
function convertExistingFormValues(previousSystem, newSystem) {
    if (!previousSystem || previousSystem === newSystem) return;
    
    const fieldMappings = [
        { id: 'inner-diameter', type: 'diameter' },
        { id: 'outer-diameter', type: 'diameter' }, 
        { id: 'pressure', type: 'pressure' },
        { id: 'yield-strength', type: 'stress' }
    ];
    
    fieldMappings.forEach(({ id, type }) => {
        const field = document.getElementById(id);
        if (field && field.value && !isNaN(parseFloat(field.value))) {
            try {
                const currentValue = parseFloat(field.value);
                
                // Convert to SI first, then to new system
                const siValue = previousSystem === 'SI' ? currentValue : toSI(currentValue, type);
                const convertedValue = newSystem === 'SI' ? siValue : fromSI(siValue, type);
                
                // Update field with converted value, maintaining reasonable precision
                field.value = convertedValue.toFixed(type === 'diameter' ? 3 : 1);
            } catch (error) {
                console.warn(`Failed to convert value for ${id}:`, error);
            }
        }
    });
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
