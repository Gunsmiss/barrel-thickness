/**
 * Units System and Conversion Module
 * Handles Metric (SI) and Imperial unit conversions for gunsmith barrel calculations
 */

// Internal state
let currentSystem = 'IP'; // Default to Imperial ('IP' for Imperial, 'SI' for metric)

// Unit conversion constants (SI base values)
const CONVERSION_FACTORS = {
    // Length conversions (base: mm)
    length: {
        'mm': 1.0,
        'in': 1.0 / 25.4  // 1 inch = 25.4 mm
    },
    
    // Pressure conversions (base: MPa)
    pressure: {
        'MPa': 1.0,
        'psi': 145.0377377,  // 1 MPa = 145.0377377 psi
        'ksi': 0.145037737   // 1 MPa = 0.145037737 ksi (thousands of psi)
    },
    
    // Elastic modulus conversions (base: GPa)
    modulus: {
        'GPa': 1.0,
        'psi': 145037.7377,  // 1 GPa = 145,037.7377 psi
        'ksi': 145.037737    // 1 GPa = 145.037737 ksi
    },
    
    // Stress conversions (base: MPa) - same as pressure
    stress: {
        'MPa': 1.0,
        'psi': 145.0377377,
        'ksi': 0.145037737
    },
    
    // Density conversions (base: kg/m³)
    density: {
        'kg/m3': 1.0,
        'lb/ft3': 0.062427974  // 1 kg/m³ = 0.062427974 lb/ft³
    }
};

// Unit definitions by system
const UNIT_SYSTEMS = {
    'SI': {
        length: 'mm',
        diameter: 'mm',
        thickness: 'mm',
        pressure: 'MPa',
        stress: 'MPa',
        modulus: 'GPa',
        density: 'kg/m3'
    },
    'IP': {
        length: 'in',
        diameter: 'in',
        thickness: 'in',
        pressure: 'psi',
        stress: 'ksi',  // Use ksi for stress in Imperial system for readability
        modulus: 'ksi',
        density: 'lb/ft3'
    }
};

/**
 * Set the current unit system
 * @param {string} system - 'SI' for metric, 'IP' for Imperial
 */
export function setSystem(system) {
    if (system !== 'SI' && system !== 'IP') {
        throw new Error('Invalid unit system. Use "SI" or "IP"');
    }
    
    const previousSystem = currentSystem;
    currentSystem = system;
    
    // Persist to localStorage
    try {
        localStorage.setItem('gunsmith-unit-system', system);
    } catch (e) {
        console.warn('Failed to save unit system to localStorage:', e);
    }
    
    // Emit custom event for UI updates
    if (typeof window !== 'undefined' && previousSystem !== system) {
        const event = new CustomEvent('unitSystemChanged', {
            detail: {
                newSystem: system,
                previousSystem: previousSystem,
                units: UNIT_SYSTEMS[system]
            }
        });
        window.dispatchEvent(event);
    }
    
    return system;
}

/**
 * Get the current unit system
 * @returns {string} Current system ('SI' or 'IP')
 */
export function getSystem() {
    return currentSystem;
}

/**
 * Convert a value between units
 * @param {number} value - The value to convert
 * @param {string} fromUnit - Source unit
 * @param {string} toUnit - Target unit
 * @returns {number} Converted value
 */
export function convert(value, fromUnit, toUnit) {
    if (typeof value !== 'number' || isNaN(value)) {
        throw new Error('Value must be a valid number');
    }
    
    if (fromUnit === toUnit) {
        return value;
    }
    
    // Find the unit category
    let category = null;
    for (const [cat, units] of Object.entries(CONVERSION_FACTORS)) {
        if (units[fromUnit] && units[toUnit]) {
            category = cat;
            break;
        }
    }
    
    if (!category) {
        throw new Error(`Cannot convert from ${fromUnit} to ${toUnit}: incompatible units`);
    }
    
    const factors = CONVERSION_FACTORS[category];
    
    // Convert to base unit, then to target unit
    const baseValue = value / factors[fromUnit];
    const convertedValue = baseValue * factors[toUnit];
    
    return convertedValue;
}

/**
 * Format a value with appropriate unit and precision
 * @param {number} value - The value to format
 * @param {string} unit - The unit to display
 * @param {number} precision - Number of decimal places (default: auto)
 * @returns {string} Formatted string with value and unit
 */
export function format(value, unit, precision = null) {
    if (typeof value !== 'number' || isNaN(value)) {
        return `-- ${unit}`;
    }
    
    // Auto-determine precision based on magnitude and unit type
    if (precision === null) {
        if (unit === 'mm' || unit === 'in') {
            // Length/diameter: 3 decimal places for small values
            precision = Math.abs(value) < 10 ? 3 : (Math.abs(value) < 100 ? 2 : 1);
        } else if (unit === 'MPa' || unit === 'psi' || unit === 'ksi') {
            // Pressure/stress: 1-2 decimal places
            precision = Math.abs(value) < 10 ? 2 : 1;
        } else if (unit === 'GPa') {
            // Modulus: 1-2 decimal places
            precision = 2;
        } else {
            // Default: 2 decimal places
            precision = 2;
        }
    }
    
    const formattedValue = value.toFixed(precision);
    return `${formattedValue} ${unit}`;
}

/**
 * Get the units for the current system
 * @returns {object} Object containing unit names for each measurement type
 */
export function getCurrentUnits() {
    return { ...UNIT_SYSTEMS[currentSystem] };
}

/**
 * Get the units for a specific system
 * @param {string} system - 'SI' or 'IP'
 * @returns {object} Object containing unit names for each measurement type
 */
export function getUnitsForSystem(system) {
    if (!UNIT_SYSTEMS[system]) {
        throw new Error(`Invalid unit system: ${system}`);
    }
    return { ...UNIT_SYSTEMS[system] };
}

/**
 * Convert a value to the current system's units from SI base units
 * @param {number} value - Value in SI base units
 * @param {string} measurementType - Type of measurement (length, pressure, etc.)
 * @returns {number} Value in current system's units
 */
export function fromSI(value, measurementType) {
    const currentUnits = getCurrentUnits();
    const targetUnit = currentUnits[measurementType];
    
    if (!targetUnit) {
        throw new Error(`Unknown measurement type: ${measurementType}`);
    }
    
    // Get SI base unit for this measurement type
    const siUnits = getUnitsForSystem('SI');
    const siUnit = siUnits[measurementType];
    
    return convert(value, siUnit, targetUnit);
}

/**
 * Convert a value from the current system's units to SI base units
 * @param {number} value - Value in current system's units
 * @param {string} measurementType - Type of measurement (length, pressure, etc.)
 * @returns {number} Value in SI base units
 */
export function toSI(value, measurementType) {
    const currentUnits = getCurrentUnits();
    const sourceUnit = currentUnits[measurementType];
    
    if (!sourceUnit) {
        throw new Error(`Unknown measurement type: ${measurementType}`);
    }
    
    // Get SI base unit for this measurement type
    const siUnits = getUnitsForSystem('SI');
    const siUnit = siUnits[measurementType];
    
    return convert(value, sourceUnit, siUnit);
}

/**
 * Initialize the units system from localStorage or default
 */
export function initialize() {
    try {
        const savedSystem = localStorage.getItem('gunsmith-unit-system');
        if (savedSystem && (savedSystem === 'SI' || savedSystem === 'IP')) {
            setSystem(savedSystem);
        } else {
            // Default to Imperial
            setSystem('IP');
        }
    } catch (e) {
        console.warn('Failed to load unit system from localStorage:', e);
        setSystem('IP');
    }
}

// Auto-initialize when module is loaded (if in browser environment)
if (typeof window !== 'undefined') {
    initialize();
}

// For testing purposes - export internal constants
export const _testing = {
    CONVERSION_FACTORS,
    UNIT_SYSTEMS
};
