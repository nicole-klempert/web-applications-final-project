/**
 * Facebook Graph API integration service.
 * Allows sending posts directly to the Facebook Graph API.
 */
export const sharePost = async (message) => {
    const accessToken = process.env.FACEBOOK_ACCESS_TOKEN || 'DEFAULT_FB_TOKEN';

    console.log(`Facebook API: Attempting to share post: "${message}"`);

    // If no real token is configured, we run in a simulated mode.
    if (accessToken === 'DEFAULT_FB_TOKEN') {
        console.log(`Facebook API: No production token configured. Simulated call to https://graph.facebook.com/v18.0/me/feed succeeded.`);
        return {
            success: true,
            mocked: true,
            id: `mock_fb_post_${Date.now()}`
        };
    }

    try {
        const response = await fetch('https://graph.facebook.com/v18.0/me/feed', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                access_token: accessToken
            })
        });

        const data = await response.json();
        if (!response.ok) {
            console.error('Facebook API: Error - Graph API returned error:', data.error);
            return { success: false, error: data.error?.message || 'Graph API error' };
        }

        console.log('Facebook API: Success - Post successfully shared. FB Post ID:', data.id);
        return { success: true, id: data.id };
    } catch (error) {
        console.error('Facebook API: Exception - Fetch request failed:', error);
        return { success: false, error: error.message };
    }
};
