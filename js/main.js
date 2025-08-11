/**
 * Gunsmith Barrel Safety Factor Calculator
 * Main application entry point
 */

import { setSystem, getSystem, convert, format, getCurrentUnits, fromSI, toSI } from './units.js';
import { analyzeCircle, generateStressField } from './calc/core.js';

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
        chamberDiameter: { placeholder: '7.92', min: '2.5', max: '50', step: '0.01' },
        boreDiameter: { placeholder: '7.82', min: '2.5', max: '50', step: '0.01' },
        outerDiameter: { placeholder: '19.05', min: '12.7', max: '100', step: '0.01' },
        barrelLength: { placeholder: '508', min: '50', max: '1500', step: '1' },
        pressure: { placeholder: '380', min: '7', max: '700', step: '1' },
        yieldStrength: { placeholder: '827', min: '200', max: '2000', step: '1' },
        trunnionOD: { placeholder: '25.4', min: '15', max: '150', step: '0.1' },
        trunnionLength: { placeholder: '38.1', min: '10', max: '200', step: '0.1' },
        interferenceFit: { placeholder: '0.025', min: '0.001', max: '0.5', step: '0.001' },
        toleranceClass: { placeholder: '6H7/g6', value: 'precision' },
        safetyFactor: { placeholder: '3.0', min: '1.5', max: '10.0', step: '0.1' }
    } : {
        chamberDiameter: { placeholder: '0.312', min: '0.1', max: '2.0', step: '0.001' },
        boreDiameter: { placeholder: '0.308', min: '0.1', max: '2.0', step: '0.001' },
        outerDiameter: { placeholder: '0.750', min: '0.5', max: '4.0', step: '0.001' },
        barrelLength: { placeholder: '20.0', min: '2', max: '60', step: '0.1' },
        pressure: { placeholder: '55000', min: '1000', max: '100000', step: '100' },
        yieldStrength: { placeholder: '120', min: '30', max: '300', step: '1' },
        trunnionOD: { placeholder: '1.000', min: '0.6', max: '6.0', step: '0.001' },
        trunnionLength: { placeholder: '1.500', min: '0.4', max: '8.0', step: '0.001' },
        interferenceFit: { placeholder: '0.001', min: '0.0001', max: '0.02', step: '0.0001' },
        toleranceClass: { placeholder: '6H7/g6', value: 'precision' },
        safetyFactor: { placeholder: '3.0', min: '1.5', max: '10.0', step: '0.1' }
    };
    
    return `
        <form id="calculation-form" novalidate>
            <!-- Basic Barrel Geometry -->
            <fieldset class="border p-3 mb-4 rounded">
                <legend class="fs-6 fw-bold">Basic Barrel Geometry</legend>
                
                <!-- Chamber/Bore Diameter -->
                <div class="mb-3">
                    <label for="chamber-diameter" class="form-label">
                        Chamber Diameter (${units.diameter}) <span class="text-danger">*</span>
                    </label>
                    <div class="form-floating">
                        <input type="number" class="form-control" id="chamber-diameter" 
                               step="${config.chamberDiameter.step}" 
                               min="${config.chamberDiameter.min}" 
                               max="${config.chamberDiameter.max}" 
                               placeholder="${config.chamberDiameter.placeholder}"
                               required
                               aria-describedby="chamber-diameter-help chamber-diameter-error">
                        <label for="chamber-diameter">Chamber Diameter</label>
                    </div>
                    <div id="chamber-diameter-help" class="form-text">
                        Internal diameter at the chamber/breech end
                    </div>
                    <div id="chamber-diameter-error" class="invalid-feedback" role="alert"></div>
                </div>

                <!-- Bore Diameter -->
                <div class="mb-3">
                    <label for="bore-diameter" class="form-label">
                        Bore Diameter (${units.diameter})
                    </label>
                    <div class="form-floating">
                        <input type="number" class="form-control" id="bore-diameter" 
                               step="${config.boreDiameter.step}" 
                               min="${config.boreDiameter.min}" 
                               max="${config.boreDiameter.max}" 
                               placeholder="${config.boreDiameter.placeholder}"
                               aria-describedby="bore-diameter-help bore-diameter-error">
                        <label for="bore-diameter">Bore Diameter</label>
                    </div>
                    <div id="bore-diameter-help" class="form-text">
                        Internal diameter at the muzzle end (leave empty to use chamber diameter)
                    </div>
                    <div id="bore-diameter-error" class="invalid-feedback" role="alert"></div>
                </div>
                
                <!-- Outer Diameter -->
                <div class="mb-3">
                    <label for="outer-diameter" class="form-label">
                        Outer Diameter (${units.diameter}) <span class="text-danger">*</span>
                    </label>
                    <div class="form-floating">
                        <input type="number" class="form-control" id="outer-diameter" 
                               step="${config.outerDiameter.step}" 
                               min="${config.outerDiameter.min}" 
                               max="${config.outerDiameter.max}" 
                               placeholder="${config.outerDiameter.placeholder}"
                               required
                               aria-describedby="outer-diameter-help outer-diameter-error">
                        <label for="outer-diameter">Outer Diameter</label>
                    </div>
                    <div id="outer-diameter-help" class="form-text">
                        Outside diameter of the barrel at the chamber
                    </div>
                    <div id="outer-diameter-error" class="invalid-feedback" role="alert"></div>
                </div>
                
                <!-- Barrel Length -->
                <div class="mb-3">
                    <label for="barrel-length" class="form-label">
                        Barrel Length (${units.length})
                    </label>
                    <div class="form-floating">
                        <input type="number" class="form-control" id="barrel-length" 
                               step="${config.barrelLength.step}" 
                               min="${config.barrelLength.min}" 
                               max="${config.barrelLength.max}" 
                               placeholder="${config.barrelLength.placeholder}"
                               aria-describedby="barrel-length-help barrel-length-error">
                        <label for="barrel-length">Barrel Length</label>
                    </div>
                    <div id="barrel-length-help" class="form-text">
                        Overall barrel length (for stress visualization and charts)
                    </div>
                    <div id="barrel-length-error" class="invalid-feedback" role="alert"></div>
                </div>
            </fieldset>

            <!-- Material and Pressure -->
            <fieldset class="border p-3 mb-4 rounded">
                <legend class="fs-6 fw-bold">Material Properties & Loading</legend>
                
                <!-- Material Selection -->
                <div class="mb-3">
                    <label for="material-select" class="form-label">
                        Material Selection <span class="text-danger">*</span>
                    </label>
                    <select class="form-select" id="material-select" required 
                            aria-describedby="material-help material-error">
                        <option value="">Select material...</option>
                        <option value="4140-annealed">4140 Steel (Annealed)</option>
                        <option value="4140-ht">4140 Steel (Heat Treated)</option>
                        <option value="4150-ht">4150 Steel (Heat Treated)</option>
                        <option value="416-ss">416 Stainless Steel</option>
                        <option value="17-4ph-h900">17-4 PH Stainless (H900)</option>
                        <option value="17-4ph-h1025">17-4 PH Stainless (H1025)</option>
                        <option value="304-ss">304 Stainless Steel</option>
                        <option value="316-ss">316 Stainless Steel</option>
                        <option value="inconel-718">Inconel 718</option>
                        <option value="ti-6al-4v">Ti-6Al-4V (Grade 5)</option>
                        <option value="custom">Custom Material...</option>
                    </select>
                    <div id="material-help" class="form-text">
                        Choose a common barrel material or select custom to enter properties manually
                    </div>
                    <div id="material-error" class="invalid-feedback" role="alert"></div>
                </div>

                <!-- Custom Material Properties (hidden by default) -->
                <div id="custom-material-section" class="mb-3 d-none">
                    <div class="row">
                        <div class="col-md-6">
                            <label for="yield-strength" class="form-label">
                                Yield Strength (${units.stress}) <span class="text-danger">*</span>
                            </label>
                            <div class="form-floating">
                                <input type="number" class="form-control" id="yield-strength" 
                                       step="${config.yieldStrength.step}" 
                                       min="${config.yieldStrength.min}" 
                                       max="${config.yieldStrength.max}" 
                                       placeholder="${config.yieldStrength.placeholder}"
                                       aria-describedby="yield-help yield-error">
                                <label for="yield-strength">Yield Strength</label>
                            </div>
                            <div id="yield-help" class="form-text">
                                Material yield strength
                            </div>
                            <div id="yield-error" class="invalid-feedback" role="alert"></div>
                        </div>
                        <div class="col-md-6">
                            <label for="elastic-modulus" class="form-label">
                                Elastic Modulus (${units.modulus})
                            </label>
                            <div class="form-floating">
                                <input type="number" class="form-control" id="elastic-modulus" 
                                       step="1" 
                                       min="10" 
                                       max="500" 
                                       placeholder="${currentSystem === 'SI' ? '200' : '29000'}"
                                       aria-describedby="modulus-help modulus-error">
                                <label for="elastic-modulus">Elastic Modulus</label>
                            </div>
                            <div id="modulus-help" class="form-text">
                                Young's modulus (optional, for advanced calculations)
                            </div>
                            <div id="modulus-error" class="invalid-feedback" role="alert"></div>
                        </div>
                    </div>
                </div>
                
                <!-- Maximum Chamber Pressure -->
                <div class="mb-3">
                    <label for="pressure" class="form-label">
                        Maximum Chamber Pressure (${units.pressure}) <span class="text-danger">*</span>
                    </label>
                    <div class="form-floating">
                        <input type="number" class="form-control" id="pressure" 
                               step="${config.pressure.step}" 
                               min="${config.pressure.min}" 
                               max="${config.pressure.max}" 
                               placeholder="${config.pressure.placeholder}"
                               required
                               aria-describedby="pressure-help pressure-error">
                        <label for="pressure">Maximum Pressure</label>
                    </div>
                    <div id="pressure-help" class="form-text">
                        Maximum expected chamber pressure (SAAMI/CIP spec + safety margin)
                    </div>
                    <div id="pressure-error" class="invalid-feedback" role="alert"></div>
                </div>
            </fieldset>

            <!-- Advanced Options Accordion -->
            <div class="accordion mb-4" id="advanced-options">
                <!-- Trunnion Parameters -->
                <div class="accordion-item">
                    <h3 class="accordion-header" id="trunnion-heading">
                        <button class="accordion-button collapsed" type="button" 
                                data-bs-toggle="collapse" data-bs-target="#trunnion-collapse" 
                                aria-expanded="false" aria-controls="trunnion-collapse">
                            🔧 Trunnion Parameters (Optional)
                        </button>
                    </h3>
                    <div id="trunnion-collapse" class="accordion-collapse collapse" 
                         aria-labelledby="trunnion-heading" data-bs-parent="#advanced-options">
                        <div class="accordion-body">
                            <div class="form-check mb-3">
                                <input class="form-check-input" type="checkbox" id="enable-trunnion">
                                <label class="form-check-label" for="enable-trunnion">
                                    Include trunnion/extension in analysis
                                </label>
                            </div>
                            
                            <div id="trunnion-params" class="d-none">
                                <div class="row">
                                    <div class="col-md-4">
                                        <label for="trunnion-od" class="form-label">
                                            Trunnion OD (${units.diameter})
                                        </label>
                                        <div class="form-floating">
                                            <input type="number" class="form-control" id="trunnion-od" 
                                                   step="${config.trunnionOD.step}" 
                                                   min="${config.trunnionOD.min}" 
                                                   max="${config.trunnionOD.max}" 
                                                   placeholder="${config.trunnionOD.placeholder}"
                                                   aria-describedby="trunnion-od-help trunnion-od-error">
                                            <label for="trunnion-od">Outer Diameter</label>
                                        </div>
                                        <div id="trunnion-od-error" class="invalid-feedback" role="alert"></div>
                                    </div>
                                    <div class="col-md-4">
                                        <label for="trunnion-length" class="form-label">
                                            Length (${units.length})
                                        </label>
                                        <div class="form-floating">
                                            <input type="number" class="form-control" id="trunnion-length" 
                                                   step="${config.trunnionLength.step}" 
                                                   min="${config.trunnionLength.min}" 
                                                   max="${config.trunnionLength.max}" 
                                                   placeholder="${config.trunnionLength.placeholder}"
                                                   aria-describedby="trunnion-length-help trunnion-length-error">
                                            <label for="trunnion-length">Length</label>
                                        </div>
                                        <div id="trunnion-length-error" class="invalid-feedback" role="alert"></div>
                                    </div>
                                    <div class="col-md-4">
                                        <label for="interference-fit" class="form-label">
                                            Interference Fit (${units.diameter})
                                        </label>
                                        <div class="form-floating">
                                            <input type="number" class="form-control" id="interference-fit" 
                                                   step="${config.interferenceFit.step}" 
                                                   min="${config.interferenceFit.min}" 
                                                   max="${config.interferenceFit.max}" 
                                                   placeholder="${config.interferenceFit.placeholder}"
                                                   aria-describedby="interference-help interference-error">
                                            <label for="interference-fit">Interference</label>
                                        </div>
                                        <div id="interference-help" class="form-text">
                                            Interference fit amount
                                        </div>
                                        <div id="interference-error" class="invalid-feedback" role="alert"></div>
                                    </div>
                                </div>
                                <div id="trunnion-od-help" class="form-text mt-2">
                                    Trunnion/barrel extension outer diameter and interference fit specifications
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Tolerances and Safety Factors -->
                <div class="accordion-item">
                    <h3 class="accordion-header" id="tolerances-heading">
                        <button class="accordion-button collapsed" type="button" 
                                data-bs-toggle="collapse" data-bs-target="#tolerances-collapse" 
                                aria-expanded="false" aria-controls="tolerances-collapse">
                            📏 Tolerances & Safety Factors
                        </button>
                    </h3>
                    <div id="tolerances-collapse" class="accordion-collapse collapse" 
                         aria-labelledby="tolerances-heading" data-bs-parent="#advanced-options">
                        <div class="accordion-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <label for="tolerance-class" class="form-label">
                                        Manufacturing Tolerance Class
                                    </label>
                                    <select class="form-select" id="tolerance-class" 
                                            aria-describedby="tolerance-help tolerance-error">
                                        <option value="precision">Precision (H7/g6)</option>
                                        <option value="standard">Standard (H8/h7)</option>
                                        <option value="commercial">Commercial (H9/h8)</option>
                                        <option value="rough">Rough (H11/h9)</option>
                                        <option value="custom">Custom...</option>
                                    </select>
                                    <div id="tolerance-help" class="form-text">
                                        Manufacturing tolerance grade affects stress concentrations
                                    </div>
                                    <div id="tolerance-error" class="invalid-feedback" role="alert"></div>
                                </div>
                                <div class="col-md-6">
                                    <label for="safety-factor" class="form-label">
                                        Target Safety Factor
                                    </label>
                                    <div class="form-floating">
                                        <input type="number" class="form-control" id="safety-factor" 
                                               step="${config.safetyFactor.step}" 
                                               min="${config.safetyFactor.min}" 
                                               max="${config.safetyFactor.max}" 
                                               placeholder="${config.safetyFactor.placeholder}"
                                               value="3.0"
                                               aria-describedby="safety-help safety-error">
                                        <label for="safety-factor">Safety Factor</label>
                                    </div>
                                    <div id="safety-help" class="form-text">
                                        Target safety factor (3.0 minimum recommended)
                                    </div>
                                    <div id="safety-error" class="invalid-feedback" role="alert"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Submit Button -->
            <div class="d-grid gap-2">
                <button type="submit" class="btn btn-primary btn-lg">
                    <i class="bi bi-calculator" aria-hidden="true"></i>
                    Calculate Safety Factor
                </button>
                <button type="button" class="btn btn-outline-secondary" id="reset-form">
                    <i class="bi bi-arrow-clockwise" aria-hidden="true"></i>
                    Reset Form
                </button>
            </div>
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
            
            // Set up mobile form event handlers
            setupMobileFormEventHandlers(mobileForm);
            
            // Sync input changes between mobile and desktop forms
            const mobileInputs = mobileForm.querySelectorAll('input, select');
            mobileInputs.forEach(input => {
                const originalId = input.id;
                input.id = `mobile-${originalId}`;
                
                // Sync changes to main form
                input.addEventListener('input', function() {
                    const mainInput = document.getElementById(originalId);
                    if (mainInput) {
                        mainInput.value = this.value;
                        if (input.type === 'checkbox') {
                            mainInput.checked = this.checked;
                        }
                        // Trigger validation on main form
                        validateInput(mainInput);
                        checkCrossFieldValidation();
                    }
                });
                
                // Sync changes from main form to mobile
                const mainInput = document.getElementById(originalId);
                if (mainInput) {
                    mainInput.addEventListener('input', function() {
                        input.value = this.value;
                        if (this.type === 'checkbox') {
                            input.checked = this.checked;
                        }
                    });
                }
            });
        }
    }
}

/**
 * Set up event handlers for mobile form
 */
function setupMobileFormEventHandlers(mobileForm) {
    // Progressive disclosure for mobile
    const mobileEnableTrunnion = mobileForm.querySelector('#mobile-enable-trunnion');
    const mobileTrunnionParams = mobileForm.querySelector('#mobile-trunnion-params');
    
    if (mobileEnableTrunnion && mobileTrunnionParams) {
        mobileEnableTrunnion.addEventListener('change', function() {
            if (this.checked) {
                mobileTrunnionParams.classList.remove('d-none');
            } else {
                mobileTrunnionParams.classList.add('d-none');
            }
        });
    }
    
    // Material selection for mobile
    const mobileMaterialSelect = mobileForm.querySelector('#mobile-material-select');
    const mobileCustomMaterialSection = mobileForm.querySelector('#mobile-custom-material-section');
    
    if (mobileMaterialSelect && mobileCustomMaterialSection) {
        mobileMaterialSelect.addEventListener('change', function() {
            const selectedValue = this.value;
            
            if (selectedValue === 'custom') {
                mobileCustomMaterialSection.classList.remove('d-none');
            } else {
                mobileCustomMaterialSection.classList.add('d-none');
                if (selectedValue && selectedValue !== '') {
                    // Populate material properties for mobile
                    const mobileYieldStrength = mobileForm.querySelector('#mobile-yield-strength');
                    if (mobileYieldStrength) {
                        populateMaterialPropertiesForInput(selectedValue, mobileYieldStrength);
                    }
                }
            }
        });
    }
    
    // Reset functionality for mobile
    const mobileResetButton = mobileForm.querySelector('#mobile-reset-form');
    if (mobileResetButton) {
        mobileResetButton.addEventListener('click', function() {
            mobileForm.reset();
            
            // Reset progressive disclosure states
            if (mobileCustomMaterialSection) {
                mobileCustomMaterialSection.classList.add('d-none');
            }
            if (mobileTrunnionParams) {
                mobileTrunnionParams.classList.add('d-none');
            }
            
            // Reset safety factor to default
            const mobileSafetyFactor = mobileForm.querySelector('#mobile-safety-factor');
            if (mobileSafetyFactor) {
                mobileSafetyFactor.value = '3.0';
            }
        });
    }
}

/**
 * Populate material properties for a specific input field
 */
function populateMaterialPropertiesForInput(materialCode, yieldStrengthInput) {
    const currentSystem = getSystem();
    
    // Material database (simplified for Task 4, will be expanded in Task 8)
    const materials = {
        '4140-annealed': { yield: currentSystem === 'SI' ? 415 : 60 },
        '4140-ht': { yield: currentSystem === 'SI' ? 655 : 95 },
        '4150-ht': { yield: currentSystem === 'SI' ? 724 : 105 },
        '416-ss': { yield: currentSystem === 'SI' ? 276 : 40 },
        '17-4ph-h900': { yield: currentSystem === 'SI' ? 1172 : 170 },
        '17-4ph-h1025': { yield: currentSystem === 'SI' ? 1000 : 145 },
        '304-ss': { yield: currentSystem === 'SI' ? 205 : 30 },
        '316-ss': { yield: currentSystem === 'SI' ? 207 : 30 },
        'inconel-718': { yield: currentSystem === 'SI' ? 1034 : 150 },
        'ti-6al-4v': { yield: currentSystem === 'SI' ? 827 : 120 }
    };
    
    const material = materials[materialCode];
    if (material && yieldStrengthInput) {
        yieldStrengthInput.value = material.yield;
    }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    const form = document.getElementById('calculation-form');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
        
        // Set up progressive disclosure
        setupProgressiveDisclosure();
        
        // Set up input validation with debouncing
        setupInputValidation();
        
        // Set up material selection functionality
        setupMaterialSelection();
        
        // Set up reset functionality
        setupResetFunctionality();
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
        { id: 'chamber-diameter', type: 'diameter' },
        { id: 'bore-diameter', type: 'diameter' },
        { id: 'outer-diameter', type: 'diameter' }, 
        { id: 'barrel-length', type: 'length' },
        { id: 'pressure', type: 'pressure' },
        { id: 'yield-strength', type: 'stress' },
        { id: 'elastic-modulus', type: 'modulus' },
        { id: 'trunnion-od', type: 'diameter' },
        { id: 'trunnion-length', type: 'length' },
        { id: 'interference-fit', type: 'diameter' }
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
                const precision = type === 'diameter' || type === 'length' ? 3 : 
                                type === 'pressure' ? 0 : 1;
                field.value = convertedValue.toFixed(precision);
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
    
    const form = event.target;
    
    // Validate all form fields
    const inputs = form.querySelectorAll('input, select');
    let isFormValid = true;
    
    inputs.forEach(input => {
        if (!validateInput(input)) {
            isFormValid = false;
        }
    });
    
    // Check cross-field validation
    if (!checkCrossFieldValidation()) {
        isFormValid = false;
    }
    
    if (!isFormValid) {
        // Show validation error
        const resultsDisplay = document.getElementById('results-display');
        resultsDisplay.innerHTML = `
            <div class="alert alert-warning" role="alert">
                <h6 class="alert-heading">⚠️ Validation Required</h6>
                <p class="mb-0">
                    Please correct the highlighted errors before proceeding with the calculation.
                </p>
            </div>
        `;
        
        // Focus on first invalid field
        const firstInvalidField = form.querySelector('.is-invalid');
        if (firstInvalidField) {
            firstInvalidField.focus();
        }
        
        return false;
    }
    
    console.log('Form submitted - performing Lamé equation calculations');
    
    // Collect form data for processing
    const formData = collectFormData();
    
    try {
        // Perform barrel analysis calculation
        const analysisResult = performBarrelAnalysis(formData);
        
        // Display results
        displayCalculationResults(analysisResult, formData);
        
        return true;
    } catch (error) {
        console.error('Calculation error:', error);
        displayCalculationError(error);
        return false;
    }
}

/**
 * Perform barrel analysis using Lamé equations
 */
function performBarrelAnalysis(formData) {
    // Convert form data to SI units for calculation
    const ri = toSI(formData.boreDiameter / 2, 'diameter'); // Convert to radius in mm
    const ro = toSI(formData.outerDiameter / 2, 'diameter'); // Convert to radius in mm
    const p_i = toSI(formData.pressure, 'pressure'); // Convert to MPa
    const Sy = toSI(formData.yieldStrength, 'pressure'); // Convert to MPa
    
    // Get ultimate strength - either user input or estimate from yield
    let Su;
    if (formData.ultimateStrength) {
        Su = toSI(formData.ultimateStrength, 'pressure');
    } else {
        // Conservative estimate: Ultimate ≈ 1.5 × Yield for typical steels
        Su = Sy * 1.5;
    }
    
    // Set up calculation parameters
    const calcParams = {
        ri: ri,
        ro: ro,
        p_i: p_i,
        p_o: 0, // Atmospheric external pressure (assumed)
        Sy: Sy,
        Su: Su,
        sigma_axial: 0 // Assume thin-walled axial stress approximation for now
    };
    
    // Perform the analysis
    const result = analyzeCircle(calcParams);
    
    // Generate stress field for visualization
    const stressField = generateStressField(
        ri,
        ro,
        result.lameCoefficients.A,
        result.lameCoefficients.B,
        50 // 50 points for smooth curves
    );
    
    // Add stress field to result
    result.stressField = stressField;
    
    // Add original form data for reference
    result.inputData = formData;
    
    return result;
}

/**
 * Display calculation results in the UI
 */
function displayCalculationResults(result, formData) {
    const resultsDisplay = document.getElementById('results-display');
    const units = formData.units;
    
    // Convert results back to display units
    const displayResult = {
        safetyFactors: result.safetyFactors,
        burstPressure: fromSI(result.burstPressure, 'pressure'),
        stresses: {
            inner: {
                sigma_r: fromSI(result.stresses.inner.sigma_r, 'pressure'),
                sigma_theta: fromSI(result.stresses.inner.sigma_theta, 'pressure'),
                sigma_vm: fromSI(result.stresses.inner.sigma_vm, 'pressure')
            },
            outer: {
                sigma_r: fromSI(result.stresses.outer.sigma_r, 'pressure'),
                sigma_theta: fromSI(result.stresses.outer.sigma_theta, 'pressure'),
                sigma_vm: fromSI(result.stresses.outer.sigma_vm, 'pressure')
            }
        }
    };
    
    // Determine safety status
    const minSafetyFactor = Math.min(result.safetyFactors.SF_y, result.safetyFactors.SF_u);
    const targetSF = formData.safetyFactor || 3.0;
    const isDesignSafe = minSafetyFactor >= targetSF;
    
    resultsDisplay.innerHTML = `
        <div class="alert ${isDesignSafe ? 'alert-success' : 'alert-warning'}" role="alert">
            <h6 class="alert-heading">${isDesignSafe ? '✅' : '⚠️'} Analysis Complete</h6>
            <p class="mb-2">
                ${isDesignSafe 
                    ? 'Design meets safety requirements.' 
                    : 'Design may not meet safety requirements - review results carefully.'}
            </p>
            <small class="text-muted">
                Results calculated using Lamé thick-walled cylinder equations.
            </small>
        </div>
        
        <div class="row">
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h6 class="card-title mb-0">🛡️ Safety Factors</h6>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-6">
                                <div class="text-center">
                                    <h5 class="text-${result.safetyFactors.SF_y >= targetSF ? 'success' : 'warning'}">
                                        ${result.safetyFactors.SF_y.toFixed(2)}
                                    </h5>
                                    <small class="text-muted">Yield SF</small>
                                </div>
                            </div>
                            <div class="col-6">
                                <div class="text-center">
                                    <h5 class="text-${result.safetyFactors.SF_u >= targetSF ? 'success' : 'warning'}">
                                        ${result.safetyFactors.SF_u.toFixed(2)}
                                    </h5>
                                    <small class="text-muted">Ultimate SF</small>
                                </div>
                            </div>
                        </div>
                        <hr>
                        <small class="text-muted">
                            Target SF: ${targetSF.toFixed(1)} | 
                            Minimum: ${minSafetyFactor.toFixed(2)}
                        </small>
                    </div>
                </div>
            </div>
            
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h6 class="card-title mb-0">💥 Burst Pressure</h6>
                    </div>
                    <div class="card-body">
                        <div class="text-center">
                            <h5 class="text-info">
                                ${displayResult.burstPressure.toFixed(1)} ${units.pressure}
                            </h5>
                            <small class="text-muted">
                                Estimated burst pressure<br>
                                Current: ${formData.pressure.toFixed(1)} ${units.pressure} 
                                (${(formData.pressure / displayResult.burstPressure * 100).toFixed(1)}%)
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="card mt-3">
            <div class="card-header">
                <h6 class="card-title mb-0">📊 Detailed Stress Analysis</h6>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-sm">
                        <thead>
                            <tr>
                                <th>Location</th>
                                <th>Radial Stress</th>
                                <th>Hoop Stress</th>
                                <th>Von Mises</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><strong>Inner Surface</strong></td>
                                <td>${displayResult.stresses.inner.sigma_r.toFixed(1)} ${units.pressure}</td>
                                <td>${displayResult.stresses.inner.sigma_theta.toFixed(1)} ${units.pressure}</td>
                                <td>${displayResult.stresses.inner.sigma_vm.toFixed(1)} ${units.pressure}</td>
                            </tr>
                            <tr>
                                <td><strong>Outer Surface</strong></td>
                                <td>${displayResult.stresses.outer.sigma_r.toFixed(1)} ${units.pressure}</td>
                                <td>${displayResult.stresses.outer.sigma_theta.toFixed(1)} ${units.pressure}</td>
                                <td>${displayResult.stresses.outer.sigma_vm.toFixed(1)} ${units.pressure}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        
        <div class="card mt-3">
            <div class="card-header">
                <h6 class="card-title mb-0">📋 Input Summary</h6>
            </div>
            <div class="card-body">
                ${generateFormDataSummary(formData)}
            </div>
        </div>
    `;
    
    // Show chart placeholder for now
    const chartsDisplay = document.getElementById('charts-display');
    chartsDisplay.innerHTML = `
        <div class="alert alert-info" role="alert">
            <h6 class="alert-heading">📈 Stress Distribution Chart</h6>
            <p class="mb-0">
                Interactive stress distribution charts will be implemented in Task 12 using Chart.js.
                Stress field data has been calculated and is available for visualization.
            </p>
        </div>
    `;
}

/**
 * Display calculation error in the UI
 */
function displayCalculationError(error) {
    const resultsDisplay = document.getElementById('results-display');
    
    resultsDisplay.innerHTML = `
        <div class="alert alert-danger" role="alert">
            <h6 class="alert-heading">❌ Calculation Error</h6>
            <p class="mb-2">
                An error occurred during the safety factor calculation:
            </p>
            <code>${error.message}</code>
            <hr>
            <small class="text-muted">
                Please check your input values and try again. If the problem persists, 
                verify that all material properties and geometric constraints are valid.
            </small>
        </div>
    `;
    
    // Clear charts display
    const chartsDisplay = document.getElementById('charts-display');
    chartsDisplay.innerHTML = '';
}

/**
 * Collect form data for processing
 */
function collectFormData() {
    const formData = {};
    const form = document.getElementById('calculation-form');
    
    if (!form) return formData;
    
    // Basic geometry
    formData.chamberDiameter = parseFloat(document.getElementById('chamber-diameter').value) || null;
    formData.boreDiameter = parseFloat(document.getElementById('bore-diameter').value) || formData.chamberDiameter;
    formData.outerDiameter = parseFloat(document.getElementById('outer-diameter').value) || null;
    formData.barrelLength = parseFloat(document.getElementById('barrel-length').value) || null;
    
    // Material and pressure
    formData.materialSelection = document.getElementById('material-select').value || null;
    formData.pressure = parseFloat(document.getElementById('pressure').value) || null;
    formData.yieldStrength = parseFloat(document.getElementById('yield-strength').value) || null;
    formData.elasticModulus = parseFloat(document.getElementById('elastic-modulus').value) || null;
    
    // Advanced options
    formData.enableTrunnion = document.getElementById('enable-trunnion').checked;
    if (formData.enableTrunnion) {
        formData.trunnionOD = parseFloat(document.getElementById('trunnion-od').value) || null;
        formData.trunnionLength = parseFloat(document.getElementById('trunnion-length').value) || null;
        formData.interferenceFit = parseFloat(document.getElementById('interference-fit').value) || null;
    }
    
    formData.toleranceClass = document.getElementById('tolerance-class').value || 'precision';
    formData.safetyFactor = parseFloat(document.getElementById('safety-factor').value) || 3.0;
    
    // System info
    formData.unitSystem = getSystem();
    formData.units = getCurrentUnits();
    
    return formData;
}

/**
 * Generate form data summary HTML
 */
function generateFormDataSummary(data) {
    const units = data.units;
    let html = '<div class="row">';
    
    // Basic geometry column
    html += '<div class="col-md-6">';
    html += '<h6>Geometry</h6>';
    html += '<ul class="list-unstyled">';
    html += `<li><strong>Chamber Diameter:</strong> ${data.chamberDiameter?.toFixed(3) || 'N/A'} ${units.diameter}</li>`;
    if (data.boreDiameter !== data.chamberDiameter) {
        html += `<li><strong>Bore Diameter:</strong> ${data.boreDiameter?.toFixed(3) || 'N/A'} ${units.diameter}</li>`;
    }
    html += `<li><strong>Outer Diameter:</strong> ${data.outerDiameter?.toFixed(3) || 'N/A'} ${units.diameter}</li>`;
    if (data.barrelLength) {
        html += `<li><strong>Barrel Length:</strong> ${data.barrelLength?.toFixed(1) || 'N/A'} ${units.length}</li>`;
    }
    html += '</ul>';
    html += '</div>';
    
    // Material and loading column
    html += '<div class="col-md-6">';
    html += '<h6>Material & Loading</h6>';
    html += '<ul class="list-unstyled">';
    html += `<li><strong>Material:</strong> ${data.materialSelection || 'Custom'}</li>`;
    html += `<li><strong>Max Pressure:</strong> ${data.pressure?.toFixed(0) || 'N/A'} ${units.pressure}</li>`;
    html += `<li><strong>Yield Strength:</strong> ${data.yieldStrength?.toFixed(0) || 'N/A'} ${units.stress}</li>`;
    html += `<li><strong>Safety Factor:</strong> ${data.safetyFactor?.toFixed(1) || 'N/A'}</li>`;
    html += '</ul>';
    html += '</div>';
    
    html += '</div>';
    
    // Trunnion info if enabled
    if (data.enableTrunnion) {
        html += '<hr><h6>Trunnion Parameters</h6>';
        html += '<ul class="list-unstyled">';
        html += `<li><strong>Trunnion OD:</strong> ${data.trunnionOD?.toFixed(3) || 'N/A'} ${units.diameter}</li>`;
        html += `<li><strong>Length:</strong> ${data.trunnionLength?.toFixed(3) || 'N/A'} ${units.length}</li>`;
        if (data.interferenceFit) {
            html += `<li><strong>Interference Fit:</strong> ${data.interferenceFit?.toFixed(4) || 'N/A'} ${units.diameter}</li>`;
        }
        html += '</ul>';
    }
    
    return html;
}

/**
 * Set up progressive disclosure functionality
 */
function setupProgressiveDisclosure() {
    // Trunnion checkbox toggle
    const enableTrunnionCheckbox = document.getElementById('enable-trunnion');
    const trunnionParams = document.getElementById('trunnion-params');
    
    if (enableTrunnionCheckbox && trunnionParams) {
        enableTrunnionCheckbox.addEventListener('change', function() {
            if (this.checked) {
                trunnionParams.classList.remove('d-none');
                // Make trunnion fields required when enabled
                trunnionParams.querySelectorAll('input').forEach(input => {
                    if (input.id !== 'interference-fit') { // interference fit is optional
                        input.setAttribute('required', '');
                    }
                });
            } else {
                trunnionParams.classList.add('d-none');
                // Remove required attribute when disabled
                trunnionParams.querySelectorAll('input').forEach(input => {
                    input.removeAttribute('required');
                    input.classList.remove('is-invalid', 'is-valid');
                    // Clear validation errors
                    const errorElement = document.getElementById(input.id + '-error');
                    if (errorElement) {
                        errorElement.textContent = '';
                    }
                });
            }
        });
    }
}

/**
 * Set up material selection functionality
 */
function setupMaterialSelection() {
    const materialSelect = document.getElementById('material-select');
    const customMaterialSection = document.getElementById('custom-material-section');
    const yieldStrengthInput = document.getElementById('yield-strength');
    
    if (materialSelect && customMaterialSection) {
        materialSelect.addEventListener('change', function() {
            const selectedValue = this.value;
            
            if (selectedValue === 'custom') {
                // Show custom material inputs
                customMaterialSection.classList.remove('d-none');
                yieldStrengthInput.setAttribute('required', '');
            } else if (selectedValue === '') {
                // No material selected
                customMaterialSection.classList.add('d-none');
                yieldStrengthInput.removeAttribute('required');
                clearCustomMaterialValidation();
            } else {
                // Predefined material selected - populate yield strength and hide custom section
                customMaterialSection.classList.add('d-none');
                yieldStrengthInput.removeAttribute('required');
                clearCustomMaterialValidation();
                
                // Set material properties based on selection
                populateMaterialProperties(selectedValue);
            }
        });
    }
}

/**
 * Clear custom material validation states
 */
function clearCustomMaterialValidation() {
    const customInputs = document.querySelectorAll('#custom-material-section input');
    customInputs.forEach(input => {
        input.classList.remove('is-invalid', 'is-valid');
        const errorElement = document.getElementById(input.id + '-error');
        if (errorElement) {
            errorElement.textContent = '';
        }
    });
}

/**
 * Populate material properties for predefined materials
 */
function populateMaterialProperties(materialCode) {
    const currentSystem = getSystem();
    
    // Material database (simplified for Task 4, will be expanded in Task 8)
    const materials = {
        '4140-annealed': { yield: currentSystem === 'SI' ? 415 : 60 },
        '4140-ht': { yield: currentSystem === 'SI' ? 655 : 95 },
        '4150-ht': { yield: currentSystem === 'SI' ? 724 : 105 },
        '416-ss': { yield: currentSystem === 'SI' ? 276 : 40 },
        '17-4ph-h900': { yield: currentSystem === 'SI' ? 1172 : 170 },
        '17-4ph-h1025': { yield: currentSystem === 'SI' ? 1000 : 145 },
        '304-ss': { yield: currentSystem === 'SI' ? 205 : 30 },
        '316-ss': { yield: currentSystem === 'SI' ? 207 : 30 },
        'inconel-718': { yield: currentSystem === 'SI' ? 1034 : 150 },
        'ti-6al-4v': { yield: currentSystem === 'SI' ? 827 : 120 }
    };
    
    const material = materials[materialCode];
    if (material) {
        const yieldStrengthInput = document.getElementById('yield-strength');
        if (yieldStrengthInput) {
            yieldStrengthInput.value = material.yield;
            // Trigger validation
            validateInput(yieldStrengthInput);
        }
    }
}

/**
 * Set up input validation with debouncing
 */
function setupInputValidation() {
    const inputs = document.querySelectorAll('#calculation-form input, #calculation-form select');
    const debounceDelay = 250;
    const debounceTimers = new Map();
    
    inputs.forEach(input => {
        // Real-time validation on input
        input.addEventListener('input', function() {
            const inputId = this.id;
            
            // Clear existing timer
            if (debounceTimers.has(inputId)) {
                clearTimeout(debounceTimers.get(inputId));
            }
            
            // Set new timer
            const timer = setTimeout(() => {
                validateInput(this);
                checkCrossFieldValidation();
                debounceTimers.delete(inputId);
            }, debounceDelay);
            
            debounceTimers.set(inputId, timer);
        });
        
        // Validation on blur (immediate)
        input.addEventListener('blur', function() {
            validateInput(this);
            checkCrossFieldValidation();
        });
    });
}

/**
 * Validate individual input field
 */
function validateInput(input) {
    const value = input.value.trim();
    const inputId = input.id;
    const errorElement = document.getElementById(inputId + '-error');
    
    // Clear previous validation state
    input.classList.remove('is-invalid', 'is-valid');
    if (errorElement) {
        errorElement.textContent = '';
    }
    
    // Skip validation for disabled/hidden fields
    if (input.disabled || input.closest('.d-none')) {
        return true;
    }
    
    let isValid = true;
    let errorMessage = '';
    
    // Required field validation
    if (input.hasAttribute('required') && !value) {
        isValid = false;
        errorMessage = 'This field is required.';
    }
    // Number input validation
    else if (input.type === 'number' && value) {
        const numValue = parseFloat(value);
        
        if (isNaN(numValue)) {
            isValid = false;
            errorMessage = 'Please enter a valid number.';
        } else {
            // Range validation
            const min = parseFloat(input.min);
            const max = parseFloat(input.max);
            
            if (!isNaN(min) && numValue < min) {
                isValid = false;
                errorMessage = `Value must be at least ${min}.`;
            } else if (!isNaN(max) && numValue > max) {
                isValid = false;
                errorMessage = `Value must be no more than ${max}.`;
            }
            
            // Field-specific validation
            if (isValid) {
                const fieldValidation = validateSpecificField(inputId, numValue);
                if (!fieldValidation.isValid) {
                    isValid = false;
                    errorMessage = fieldValidation.message;
                }
            }
        }
    }
    // Select validation
    else if (input.tagName === 'SELECT' && input.hasAttribute('required') && !value) {
        isValid = false;
        errorMessage = 'Please select an option.';
    }
    
    // Apply validation state
    if (isValid && value) {
        input.classList.add('is-valid');
    } else if (!isValid) {
        input.classList.add('is-invalid');
        if (errorElement) {
            errorElement.textContent = errorMessage;
        }
    }
    
    return isValid;
}

/**
 * Validate specific field logic
 */
function validateSpecificField(inputId, value) {
    switch (inputId) {
        case 'chamber-diameter':
        case 'bore-diameter':
            if (value <= 0) {
                return { isValid: false, message: 'Diameter must be greater than 0.' };
            }
            break;
            
        case 'outer-diameter':
            if (value <= 0) {
                return { isValid: false, message: 'Outer diameter must be greater than 0.' };
            }
            break;
            
        case 'pressure':
            if (value <= 0) {
                return { isValid: false, message: 'Pressure must be greater than 0.' };
            }
            break;
            
        case 'yield-strength':
            if (value <= 0) {
                return { isValid: false, message: 'Yield strength must be greater than 0.' };
            }
            break;
            
        case 'safety-factor':
            if (value < 1.0) {
                return { isValid: false, message: 'Safety factor must be at least 1.0.' };
            }
            if (value < 2.0) {
                return { isValid: true, message: 'Warning: Safety factors below 2.0 are not recommended for firearms.' };
            }
            break;
    }
    
    return { isValid: true };
}

/**
 * Check cross-field validation (e.g., OD > ID)
 */
function checkCrossFieldValidation() {
    const chamberDiameter = parseFloat(document.getElementById('chamber-diameter').value);
    const boreDiameter = parseFloat(document.getElementById('bore-diameter').value);
    const outerDiameter = parseFloat(document.getElementById('outer-diameter').value);
    
    const outerDiameterInput = document.getElementById('outer-diameter');
    const outerDiameterError = document.getElementById('outer-diameter-error');
    
    // Check if outer diameter is greater than inner diameter
    const innerDiameter = boreDiameter || chamberDiameter; // Use bore diameter if available, otherwise chamber
    
    if (!isNaN(innerDiameter) && !isNaN(outerDiameter)) {
        if (outerDiameter <= innerDiameter) {
            outerDiameterInput.classList.remove('is-valid');
            outerDiameterInput.classList.add('is-invalid');
            if (outerDiameterError) {
                outerDiameterError.textContent = 'Outer diameter must be greater than inner diameter.';
            }
            return false;
        } else {
            // Re-validate the outer diameter field normally
            validateInput(outerDiameterInput);
        }
    }
    
    return true;
}

/**
 * Set up reset functionality
 */
function setupResetFunctionality() {
    const resetButton = document.getElementById('reset-form');
    const form = document.getElementById('calculation-form');
    
    if (resetButton && form) {
        resetButton.addEventListener('click', function() {
            // Reset form
            form.reset();
            
            // Clear validation states
            const inputs = form.querySelectorAll('input, select');
            inputs.forEach(input => {
                input.classList.remove('is-invalid', 'is-valid');
                const errorElement = document.getElementById(input.id + '-error');
                if (errorElement) {
                    errorElement.textContent = '';
                }
            });
            
            // Reset progressive disclosure states
            const customMaterialSection = document.getElementById('custom-material-section');
            const trunnionParams = document.getElementById('trunnion-params');
            
            if (customMaterialSection) {
                customMaterialSection.classList.add('d-none');
            }
            
            if (trunnionParams) {
                trunnionParams.classList.add('d-none');
            }
            
            // Reset safety factor to default
            const safetyFactorInput = document.getElementById('safety-factor');
            if (safetyFactorInput) {
                safetyFactorInput.value = '3.0';
            }
            
            // Clear results and charts
            const resultsDisplay = document.getElementById('results-display');
            const chartsDisplay = document.getElementById('charts-display');
            
            if (resultsDisplay) {
                resultsDisplay.innerHTML = `
                    <div class="text-center text-muted">
                        <p>Enter parameters to see results</p>
                    </div>
                `;
            }
            
            if (chartsDisplay) {
                chartsDisplay.innerHTML = `
                    <div class="text-center text-muted">
                        <p>Charts will appear after calculation</p>
                    </div>
                `;
            }
        });
    }
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
