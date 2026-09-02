import User from '../models/userModel.js';
import Group from '../models/groupModel.js';
import Post from '../models/postModel.js';

// get profile post and group statistics
// fetches a user's total post count and categorizes their groups based on their role and profile visibility.
export const getProfileStats = async (req, res, next) => {
    try {
        // find the target user by the username provided in the URL parameter
        const user = await User.findByUsername(req.params.username);
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });

        // check if the logged-in user is viewing their own profile
        const isOwn = String(user._id) === String(req.session.user.id);

        // - Base condition - find groups where the user is an owner, admin, or regular member
        const base = { $or: [{ owner: user._id }, { admins: user._id }, { members: user._id }] };

        // if viewing someone else's profile, restrict the results to ONLY show PUBLIC groups. 
        // if viewing their own profile, fetch all groups(including private ones).
        const groupQuery = isOwn
            ? base
            : { $and: [base, { $or: [{ isPublic: true }, { isPublic: { $exists: false } }] }] };

        // Fetch and sort the filtered groups from the database, populating owner details
        const groups = await Group.find(groupQuery).populate('owner').sort({ createdAt: -1 });

        const managedGroups = [];
        const memberGroups = [];
        groups.forEach(group => {

            // determine if the target user has managerial rights (owner or admin) in this group
            const managed = String(group.owner?._id || group.owner) === String(user._id) ||
                (group.admins || []).some(id => String(id._id || id) === String(user._id));

            // format the group data securely and cleanly for the client response
            const item = {
                _id: group._id,
                name: group.name,
                description: group.description || '',
                image: group.image || '',
                city: group.city || '',
                category: group.category || '',
                memberCount: (group.members || []).length,
                isPublic: group.isPublic !== false
            };

            // push to the appropriate array based on the user's role
            if (managed) {
                managedGroups.push(item);
            } else {
                memberGroups.push(item);
            }
        });
        // count total posts authored by this user.
        const postCount = await Post.countDocuments({
            author: new RegExp(`^${user.username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
        });

        res.json({
            success: true,
            stats: {
                postCount,
                groupCount: managedGroups.length + memberGroups.length,
                managedGroups,
                memberGroups
            }
        });

    } catch (error) {
        next(error);
    }
};
