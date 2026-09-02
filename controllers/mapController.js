// map configuration
export const getMapConfig = (req, res) => {
    // Retrieve the Google Maps API key from the environment variables (.env file)
    // Fallback to an empty string if the variable is undefined to prevent runtime crashes
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || '';

    // If the API key is missing or not configured on the server,
    // return a 503 (Service Unavailable) error status to the client
    if (!apiKey) {
        return res.status(503).json({
            success: false,
            error: 'Google Maps API key is not configured'
        });
    }

    // Send a successful JSON response containing the API key
    // so the client-side script can securely initialize the map
    res.json({success:true,apiKey});
};
