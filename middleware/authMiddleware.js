import Post from '../models/postModel.js';
import Group from '../models/groupModel.js';

/**
 * middleware to check if the user is authenticated.
 * if the user has a valid session we can continue.
 * otherwise, we return a 401 status for JSON/AJAX requests or redirect to the login page.
 */
export const isAuthenticated = (req, res, next) => {
    // if the user object exists in session, the user is logged in
    if (req.session && req.session.user) {
        return next();
    }

    // check if the request expects a JSON response (like AJAX/Fetch calls)
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Please log in first.' });
    }

    // for normal browser requests, redirect to the login page with an error parameter
    return res.redirect('/login.html?error=Please log in to access this page.');
};

/**
 * middleware to check if the logged-in user is the owner of the post.
 * this prevents users from editing or deleting posts created by others.
 */
export const isPostOwner = async (req, res, next) => {
    try {
        const { postId } = req.params;

        // find the post in the database
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ success: false, error: 'Post not found.' });
        }

        // get the logged-in username from the session
        const loggedInUsername = req.session.user.username;

        // check if the logged-in user is the author of the post (not case sensitive)
        if (post.author.toLowerCase() !== loggedInUsername.toLowerCase()) {
            return res.status(403).json({ success: false, error: '403 Forbidden: You do not own this post.' });
        }

        // attach the post to the request object so we don't need to query it again in the controller
        req.post = post;
        next();
    } catch (error) {
        console.error('Error in post ownership check:', error);
        return res.status(500).json({ success: false, error: 'Internal server authorization error.' });
    }
};

export const canDeletePost = async (req, res, next) => {
    try {
        const post = await Post.findById(req.params.postId);
        if (!post) return res.status(404).json({ success: false, error: 'Post not found.' });
        if ((post.author || '').toLowerCase() === (req.session.user.username || '').toLowerCase()) {
            req.post = post;
            return next();
        }
        if (post.group) {
            const group = await Group.findById(post.group);
            const userId = req.session.user.id;
            if (group && (String(group.owner) === String(userId) || (group.admins || []).some(id => String(id) === String(userId)))) {
                req.post = post;
                return next();
            }
        }
        return res.status(403).json({ success: false, error: '403 Forbidden: You are not authorized to delete this post.' });
    } catch (error) {
        console.error('Error in post delete authorization:', error);
        return res.status(500).json({ success: false, error: 'Internal server authorization error.' });
    }
};

const loadGroup = async (req, res) => {
    const group = await Group.findById(req.params.groupId);
    if (!group) {
        res.status(404).json({ success: false, error: 'Group not found' });
        return null;
    }
    return group;
};

export const isGroupAdmin = async (req, res, next) => {
    try {
        const group = await loadGroup(req, res);
        if (!group) return;
        const userId = req.session.user.id;
        const isAllowed = String(group.owner) === String(userId) || (group.admins || []).some(id => String(id) === String(userId));
        if (!isAllowed) return res.status(403).json({ success: false, error: 'Only the group owner or an admin can perform this action' });
        req.group = group;
        next();
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Group authorization failed' });
    }
};

/**
 * placeholder for group owner middleware (will be fully implemented when Group model is done).
 */
export const isGroupOwner = async (req, res, next) => {
    try {
        const group = await loadGroup(req, res);
        if (!group) return;
        if (String(group.owner) !== String(req.session.user.id)) return res.status(403).json({ success: false, error: 'Only the group owner can perform this action' });
        req.group = group;
        next();
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Group authorization failed' });
    }
};
