/**
 * Geofence Utility for BarnalaByte Library Management System
 * Uses Haversine distance formula to verify student location relative to configured Library coordinates.
 */

/**
 * Calculates real-world distance between two geographic points in meters using Haversine formula.
 * @param {number} lat1 Latitude of point 1
 * @param {number} lon1 Longitude of point 1
 * @param {number} lat2 Latitude of point 2
 * @param {number} lon2 Longitude of point 2
 * @returns {number} Distance in meters
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const p1 = Number(lat1);
    const n1 = Number(lon1);
    const p2 = Number(lat2);
    const n2 = Number(lon2);

    if (isNaN(p1) || isNaN(n1) || isNaN(p2) || isNaN(n2)) {
        throw new Error("Invalid latitude or longitude coordinate.");
    }

    const R = 6371000; // Radius of Earth in meters
    const toRad = (angle) => (angle * Math.PI) / 180;

    const dLat = toRad(p2 - p1);
    const dLon = toRad(n2 - n1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(p1)) * Math.cos(toRad(p2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c;
    return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

/**
 * Verifies whether student location is within configured library geofence radius.
 * @param {number|string} studentLat 
 * @param {number|string} studentLng 
 * @returns {Object} { inRange, distanceMeters, libraryLat, libraryLng, maxRadiusMeters }
 */
const verifyLibraryGeofence = (studentLat, studentLng) => {
    const lat = Number(studentLat);
    const lng = Number(studentLng);

    if (studentLat === undefined || studentLng === undefined || studentLat === null || studentLng === null || isNaN(lat) || isNaN(lng)) {
        return {
            validInputs: false,
            inRange: false,
            message: "Unable to detect your current location. Please provide valid GPS coordinates.",
            distanceMeters: null
        };
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return {
            validInputs: false,
            inRange: false,
            message: "Invalid GPS coordinates received.",
            distanceMeters: null
        };
    }

    const libraryLat = Number(process.env.LIBRARY_LATITUDE || "30.3782");
    const libraryLng = Number(process.env.LIBRARY_LONGITUDE || "75.5459");
    const maxRadiusMeters = Number(process.env.LIBRARY_GEOFENCE_RADIUS || "20");

    const distanceMeters = calculateDistance(lat, lng, libraryLat, libraryLng);
    const inRange = distanceMeters <= maxRadiusMeters;

    return {
        validInputs: true,
        inRange,
        distanceMeters,
        libraryLat,
        libraryLng,
        maxRadiusMeters,
        message: inRange
            ? `Location verified within library range (${distanceMeters}m).`
            : `You are outside the library's ${maxRadiusMeters} meter attendance range. (Current distance: ${distanceMeters}m)`
    };
};

module.exports = {
    calculateDistance,
    verifyLibraryGeofence
};
