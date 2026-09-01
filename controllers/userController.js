import User from '../models/userModel.js';
import Post from '../models/postModel.js';
import Group from '../models/groupModel.js';
import { decrypt } from '../utils/cryptoUtils.js';

// GET /users/:username
// extracts user profile information for the given username
export const getUserProfile = async (req, res) => {
    try {
        const { username } = req.params;
        const { currentUser } = req.query; // get current user for permissions

        const user = await User.findByUsername(username);

        // if user was deleted but still has posts, return a fallback to avoid UI crashes
        if (!user) {
            return res.status(200).json({
                success: true,
                user: {
                    username: username,
                    profilePicture: "",
                    bio: "This user profile is no longer available.",
                    friends: [],
                    friendRequests: [],
                    hasSentRequest: false,
                    createdAt: new Date()
                }
            });
        }

        // get friends details (username and profile picture) for each friend
        const friendsDetails = await Promise.all(
            (user.friends || []).map(async (friendUsername) => {
                const fUser = await User.findByUsername(friendUsername);
                return fUser ? { username: fUser.username, profilePicture: fUser.profilePicture || "" } : { username: friendUsername, profilePicture: "" };
            })
        );

        const isOwner = currentUser && currentUser.toLowerCase() === user.username.toLowerCase();

        // check if the current user has sent a friend request to this user
        const hasSentRequest = currentUser ? (user.friendRequests || []).some(u => u.toLowerCase() === currentUser.toLowerCase()) : false;

        return res.status(200).json({
            success: true,
            user: {
                username: user.username,
                email: isOwner ? user.email : undefined,
                profilePicture: user.profilePicture || "",
                bio: user.bio || "",
                city: user.city || "",
                friends: friendsDetails,
                friendsCount: user.friends ? user.friends.length : 0,
                groupsCount: ((user.joinedGroups ? user.joinedGroups.length : 0) + (user.managedGroups ? user.managedGroups.length : 0)),
                friendRequests: isOwner ? (user.friendRequests || []) : undefined,
                hasSentRequest: hasSentRequest,
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
        const { bio, city, profilePicture, currentUser } = req.body;

        // server-side validation: ensure that the current user is the same as the username being updated
        if (currentUser && currentUser.toLowerCase() !== username.toLowerCase()) {
            return res.status(403).json({ success: false, error: '403 Forbidden: You can only edit your own profile' });
        }

        const user = await User.findByUsername(username);
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        if (bio !== undefined) user.bio = bio;
        if (city !== undefined) user.city = city;

        if (profilePicture !== undefined) {
            console.log(`[Update] New profile picture received. Updating User DB...`);
            user.profilePicture = profilePicture;

            // update profile pic. in all posts (strict: false bypasses strict schema rules)
            const postUpdateResult = await Post.updateMany(
                { author: new RegExp('^' + username.trim() + '$', 'i') },
                { $set: { authorProfilePic: profilePicture } },
                { strict: false }
            );

            // update in all comments
            const commentUpdateResult = await Post.updateMany(
                { "comments.author": new RegExp('^' + username.trim() + '$', 'i') },
                { $set: { "comments.$[elem].authorProfilePic": profilePicture } },
                { arrayFilters: [{ "elem.author": new RegExp('^' + username.trim() + '$', 'i') }], strict: false }
            );
        }

        await user.save();

        return res.status(200).json({
            success: true,
            user: {
                username: user.username,
                bio: user.bio,
                city: user.city,
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

        // safeguard: ensure friends and friendRequests arrays are initialized
        user.friends = user.friends || [];
        user.friendRequests = user.friendRequests || [];
        targetUser.friends = targetUser.friends || [];
        targetUser.friendRequests = targetUser.friendRequests || [];

        const uName = user.username;
        const tName = targetUser.username;

        if (action === 'request') {
            // sending a friend request (adding to target user's friendRequests if not already friends or requested)
            if (!targetUser.friendRequests.includes(uName) && !targetUser.friends.includes(uName)) {
                targetUser.friendRequests.push(uName);
            }
        } else if (action === 'accept') {
            // confirming a friend request 
            user.friendRequests = user.friendRequests.filter(u => u.toLowerCase() !== tName.toLowerCase());
            targetUser.friendRequests = targetUser.friendRequests.filter(u => u.toLowerCase() !== uName.toLowerCase());
            if (!user.friends.includes(tName)) user.friends.push(tName);
            if (!targetUser.friends.includes(uName)) targetUser.friends.push(uName);
        } else if (action === 'reject' || action === 'cancel') {
            // ignoring a friend request 
            user.friendRequests = user.friendRequests.filter(u => u.toLowerCase() !== tName.toLowerCase());
            targetUser.friendRequests = targetUser.friendRequests.filter(u => u.toLowerCase() !== uName.toLowerCase());
        } else if (action === 'remove') {
            // removing a friend 
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
// searches users by username, and joined date range (using in-memory decryption filter due to encryption)
// In the ram of the node.js and not in mongo because it has the decryption key
export const searchUsers = async (req, res, next) => {
    try {
        const { username, joinedFrom, joinedTo } = req.query;

        // validate date range order
        if (joinedFrom && joinedTo) {
            const startDate = new Date(joinedFrom);
            const endDate = new Date(joinedTo);
            if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && startDate > endDate) {
                return res.status(400).json({ success: false, error: 'From date cannot be later than To date' });
            }
        }

        const query = {};

        // filter by username using regex for case-insensitive partial match
        if (username && username.trim() !== "") {
            query.username = { $regex: username.trim(), $options: 'i' };
        }

        // search by joined date range (createdAt field)
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
        let filteredUsers = users;

        // map to non-sensitive response format
        const responseData = filteredUsers.map(u => ({
            username: u.username,
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

// GET /users (List/Search)
export const listUsers = async (req, res) => {
    try {
        const { search } = req.query;
        // For now, an empty array as a placeholder for the user list.
        return res.status(200).json({ success: true, users: [] });
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Failed to list users' });
    }
};

// DELETE /users/:username (Delete own user and posts)
export const deleteUser = async (req, res) => {
    try {
        const { username } = req.params;
        const { currentUser } = req.body;

        if (currentUser && currentUser.toLowerCase() !== username.toLowerCase()) {
            return res.status(403).json({ success: false, error: 'Forbidden: Cannot delete other users' });
        }

        const user = await User.findByUsername(username);
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });

        const targetUsername = user.username;
        const userId = user._id;

        // delete all posts authored by this user
        await Post.deleteMany({ author: new RegExp('^' + targetUsername + '$', 'i') });

        // remove this user from everyone else's friends lists and friend requests
        await User.updateMany(
            {},
            {
                $pull: {
                    friends: targetUsername,
                    friendRequests: targetUsername
                }
            }
        );

        // update all groups related to the deleted user
        const groups = await Group.find({
            $or: [
                { members: userId },
                { admins: userId },
                { owner: userId },
                { joinRequests: userId }
            ]
        });

        for (const group of groups) {
            group.members = (group.members || []).filter(member => String(member) !== String(userId));
            group.admins = (group.admins || []).filter(admin => String(admin) !== String(userId));
            group.joinRequests = (group.joinRequests || []).filter(request => String(request) !== String(userId));

            // transfer ownership to another admin if possible
            if (String(group.owner) === String(userId)) {
                group.owner = group.admins.length > 0 ? group.admins[0] : null;
            }

            // delete the group if it no longer has members or admins
            if (group.members.length === 0 || group.admins.length === 0) {
                await Post.deleteMany({ group: group._id });

                await User.updateMany(
                    { $or: [{ joinedGroups: group._id }, { managedGroups: group._id }] },
                    { $pull: { joinedGroups: group._id, managedGroups: group._id } }
                );

                await Group.deleteOne({ _id: group._id });
            } else {
                await group.save();
            }
        }

        // delete the user itself
        await User.deleteOne({ _id: userId });

        return res.status(200).json({ success: true, message: "User and posts deleted" });
    } catch (error) {
        console.error('Error deleting user:', error);
        return res.status(500).json({ success: false, error: 'Failed to delete user' });
    }
};