import User from '../models/userModel.js';
import { decrypt } from '../utils/cryptoUtils.js';

// GET /users/:username
// extracts user profile information for the given username
export const getUserProfile = async (req, res) => {
    try {
        const { username } = req.params;
        const user = await User.findByUsername(username);

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // get friends details (username and profile picture) for each friend
        const friendsDetails = await Promise.all(
            (user.friends || []).map(async (friendUsername) => {
                const fUser = await User.findByUsername(friendUsername);
                return fUser ? { username: fUser.username, profilePicture: fUser.profilePicture || "" } : { username: friendUsername, profilePicture: "" };
            })
        );

        return res.status(200).json({
            success: true,
            user: {
                username: user.username,
                email: user.email,
                profilePicture: user.profilePicture || "",
                bio: user.bio || "",
                friends: friendsDetails,
                friendRequests: user.friendRequests || [],
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return res.status(500).json({ success: false, error: 'Failed to fetch user profile' });
    }
};

// PUT /users/:username
// updates user profile information for the given username
export const updateUserProfile = async (req, res) => {
    try {
        const { username } = req.params;
        const { bio, profilePicture, currentUser } = req.body;

        // server-side validation: ensure that the current user is the same as the username being updated
        if (currentUser && currentUser.toLowerCase() !== username.toLowerCase()) {
            return res.status(403).json({ success: false, error: '403 Forbidden: You can only edit your own profile' });
        }

        const user = await User.findByUsername(username);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        if (bio !== undefined) user.bio = bio;
        if (profilePicture !== undefined) user.profilePicture = profilePicture;

        await user.save();

        return res.status(200).json({
            success: true,
            user: {
                username: user.username,
                bio: user.bio,
                profilePicture: user.profilePicture
            }
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        return res.status(500).json({ success: false, error: 'Failed to update profile' });
    }
};

// POST /users/:username/friends
// toggles friendship status between the user and the target user
export const toggleFriend = async (req, res) => {
    try {
        const { username } = req.params; // connected user
        const { targetUsername, action } = req.body; // dest user and action (request, accept, reject, cancel, remove)

        if (!targetUsername || username.toLowerCase() === targetUsername.toLowerCase()) {
            return res.status(400).json({ success: false, error: 'Invalid friend action' });
        }

        const user = await User.findByUsername(username);
        const targetUser = await User.findByUsername(targetUsername);

        if (!user || !targetUser) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const uName = user.username;
        const tName = targetUser.username;

        if (action === 'request') {
            // sending a friend request (adding to target user's friendRequests if not already friends or requested)
            if (!targetUser.friendRequests.includes(uName) && !targetUser.friends.includes(uName)) {
                targetUser.friendRequests.push(uName);
            }
        } else if (action === 'accept') {
            // confirming a friend request (removing from friendRequests and adding to friends for both users)
            user.friendRequests = user.friendRequests.filter(u => u.toLowerCase() !== tName.toLowerCase());
            targetUser.friendRequests = targetUser.friendRequests.filter(u => u.toLowerCase() !== uName.toLowerCase());
            if (!user.friends.includes(tName)) user.friends.push(tName);
            if (!targetUser.friends.includes(uName)) targetUser.friends.push(uName);
        } else if (action === 'reject' || action === 'cancel') {
            // ignoring a friend request (removing from friendRequests for both users)
            user.friendRequests = user.friendRequests.filter(u => u.toLowerCase() !== tName.toLowerCase());
            targetUser.friendRequests = targetUser.friendRequests.filter(u => u.toLowerCase() !== uName.toLowerCase());
        } else if (action === 'remove') {
            // removing a friend (removing from friends for both users)
            user.friends = user.friends.filter(f => f.toLowerCase() !== tName.toLowerCase());
            targetUser.friends = targetUser.friends.filter(f => f.toLowerCase() !== uName.toLowerCase());
        }

        await user.save();
        await targetUser.save();

        return res.status(200).json({ success: true, friends: user.friends, friendRequests: user.friendRequests });
    } catch (error) {
        console.error('Error in friend action:', error);
        return res.status(500).json({ success: false, error: 'Failed to process friend action' });
    }
};

// GET /users/search
// searches users by username, email, and joined date range (using in-memory decryption filter due to encryption)
// In the ram of the node.js and not in mongo because it has the decryption key
export const searchUsers = async (req, res, next) => {
    try {
        const { username, email, joinedFrom, joinedTo } = req.query;

        // validate date range order
        if (joinedFrom && joinedTo) {
            const startDate = new Date(joinedFrom);
            const endDate = new Date(joinedTo);
            if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && startDate > endDate) {
                return res.status(400).json({ success: false, error: 'From date cannot be later than To date' });
            }
        }

        // build database pre-filter for unencrypted createdAt range (we will use the mongo to filter down the user list as much as possible
        // so we will try to filter first by the unencrypted fields)
        const query = {};
        if (joinedFrom || joinedTo) {
            query.createdAt = {};
            if (joinedFrom) {
                const startDate = new Date(joinedFrom);
                if (!isNaN(startDate.getTime())) {
                    query.createdAt.$gte = startDate;
                }
            }
            if (joinedTo) {
                const endDate = new Date(joinedTo);
                if (!isNaN(endDate.getTime())) {
                    endDate.setHours(23, 59, 59, 999);
                    query.createdAt.$lte = endDate;
                }
            }
        }

        const users = await User.find(query);

        // perform in-memory decryption (in the ram of the node.js and not in mongo because it has the decryption key) filtering on virtual fields
        // Exclude stale user records that failed to decrypt under the current ENCRYPTION_KEY
        // To avoid triggering the virtual getters' console.error, we test decryption on raw fields silently
        let filteredUsers = [];
        for (const u of users) {
            try {
                if (u.usernameEncrypted) decrypt(u.usernameEncrypted);
                if (u.emailEncrypted) decrypt(u.emailEncrypted);
                filteredUsers.push(u);
            } catch (err) {
                // silently skip stale record
            }
        }

        if (username && username.trim() !== "") {
            const usernameTerm = username.trim().toLowerCase();
            filteredUsers = filteredUsers.filter(u =>
                u.username && u.username.toLowerCase().includes(usernameTerm)
            );
        }

        if (email && email.trim() !== "") {
            const emailTerm = email.trim().toLowerCase();
            filteredUsers = filteredUsers.filter(u =>
                u.email && u.email.toLowerCase().includes(emailTerm)
            );
        }

        // map to non-sensitive response format
        const responseData = filteredUsers.map(u => ({
            username: u.username,
            email: u.email,
            profilePicture: u.profilePicture || "",
            createdAt: u.createdAt
        }));

        return res.status(200).json({
            success: true,
            users: responseData
        });
    } catch (error) {
        console.error('Error searching users:', error);
        return res.status(500).json({ success: false, error: 'Failed to search users' });
    }
};