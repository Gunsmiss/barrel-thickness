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
 * Set up event listeners
 */
function setupEventListeners() {
    const form = document.getElementById('calculation-form');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
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
