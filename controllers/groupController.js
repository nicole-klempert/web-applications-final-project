// JavaScript source code

import Group from '../models/groupModel.js';
import User from '../models/userModel.js';
import Post from '../models/postModel.js';

// group helpers
const sameId = (a, b) => Boolean(a && b && String(a._id || a) === String(b._id || b));

// Delete a group together with all of its related posts and user references
const deleteGroupWithPosts = async group => {
    await Post.deleteMany({ group: group._id });

    // Remove the group from users' joined and managed groups
    await User.updateMany(
        { $or: [{ joinedGroups: group._id }, { managedGroups: group._id }] },
        { $pull: { joinedGroups: group._id, managedGroups: group._id } }
    );

    await Group.deleteOne({ _id: group._id });
};

// Delete the group if it has no members or admins left
const deleteGroupIfEmpty = async group => {
    if ((group.members || []).length === 0 || (group.admins || []).length === 0) {
        await deleteGroupWithPosts(group);
        return true;
    }

    return false;
};

// Return only the user fields required by the client
const safeUser = user => user ? {
    _id: user._id,
    username: user.username || 'User',
    profilePicture: user.profilePicture || ''
} : null;

// Prepare the group object and calculate the current user's permissions
const toClient = (group, currentUserId) => {
    const ownerId = group.owner?._id || group.owner;
    const adminIds = (group.admins || []).map(value => value?._id || value);
    const memberIds = (group.members || []).map(value => value?._id || value);
    const requestIds = (group.joinRequests || []).map(value => value?._id || value);

    return {
        _id: group._id,
        name: group.name,
        description: group.description || '',
        category: group.category || '',
        image: group.image || '',
        isPublic: group.isPublic !== false,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
        owner: safeUser(group.owner),
        admins: (group.admins || []).map(safeUser).filter(Boolean),
        members: (group.members || []).map(safeUser).filter(Boolean),
        joinRequests: (group.joinRequests || []).map(safeUser).filter(Boolean),
        memberCount: memberIds.length,
        isOwner: sameId(ownerId, currentUserId),
        isAdmin: adminIds.some(id => sameId(id, currentUserId)),
        isMember: memberIds.some(id => sameId(id, currentUserId)),
        isRequested: requestIds.some(id => sameId(id, currentUserId))
    };
};

// Fetch a group by ID and populate its related users
const populatedGroup = id => Group.findById(id)
    .populate('owner')
    .populate('admins')
    .populate('members')
    .populate('joinRequests');

// GET /groups
// get groups with filters and pagination
export const getGroups = async (req, res, next) => {
    try {
        // Pagination parameters with defaults and limits
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 6, 1), 50);
        const skip = (page - 1) * limit;

        const query = {};

        // filter groups by name or description
        if (req.query.search?.trim()) {
            const regex = new RegExp(req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            query.$or = [{ name: regex }, { description: regex }];
        }

        // filter groups by category
        if (req.query.category?.trim()) {
            query.category = req.query.category.trim();
        }

        // return only public groups when requested
        if (req.query.publicOnly === 'true') {
            query.isPublic = { $ne: false };
        }

        // Count the total groups matching the query for pagination
        const totalGroups = await Group.countDocuments(query);

        // Fetch the groups and populate their related users
        const groups = await Group.find(query)
            .populate('owner')
            .populate('admins')
            .populate('members')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalPages = Math.ceil(totalGroups / limit);

        // Return the groups along with pagination metadata
        res.json({
            success: true,
            groups: groups.map(group => toClient(group, req.session.user.id)),
            currentPage: page,
            totalPages,
            totalGroups,
            hasMore: page < totalPages
        });
    } catch (error) {
        next(error);
    }
};

// GET /groups/:groupId
export const getGroupById = async (req, res, next) => {
    try {
        // Fetch the group by ID and populate its related users
        const group = await populatedGroup(req.params.groupId);

        // If the group is not found, return a 404 error
        if (!group) return res.status(404).json({ success: false, error: 'Group not found' });

        const prepared = toClient(group, req.session.user.id);

        // Prevent users who are not members from viewing a private group
        if (!prepared.isPublic && !prepared.isMember) {
            return res.status(403).json({ success: false, error: 'This group is private' });
        }

        // Return the prepared group data
        res.json({ success: true, group: prepared });
    } catch (error) {
        next(error);
    }
};

// POST /groups
// create a group and add the owner as a member and admin
export const createGroup = async (req, res, next) => {
    try {
        // Destructure the group fields from the request body
        const { name, description = '', category = '', image = '', isPublic = true } = req.body;

        // Validate that a group name was provided
        if (!name?.trim()) {
            return res.status(400).json({ success: false, error: 'Group name is required' });
        }

        // Validate the maximum group name length
        if (name.trim().length > 80) {
            return res.status(400).json({ success: false, error: 'Group name cannot exceed 80 characters' });
        }

        // Validate the maximum description length
        if (description.length > 500) {
            return res.status(400).json({ success: false, error: 'Description cannot exceed 500 characters' });
        }

        // Check if another group already exists with the same name
        const escaped = name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const duplicate = await Group.findOne({
            name: { $regex: `^${escaped}$`, $options: 'i' }
        });

        if (duplicate) {
            return res.status(400).json({ success: false, error: 'A group with this name already exists' });
        }

        const userId = req.session.user.id;

        // Create the group and add the current user as owner, admin and member
        const group = await Group.create({
            name: name.trim(),
            description: description.trim(),
            category: category.trim(),
            image,
            isPublic: isPublic !== false,
            owner: userId,
            admins: [userId],
            members: [userId]
        });

        // Add the group to the owner's managed and joined groups
        await User.findByIdAndUpdate(userId, {
            $addToSet: { managedGroups: group._id, joinedGroups: group._id }
        });

        // Fetch the populated group and return it to the client
        const full = await populatedGroup(group._id);
        res.status(201).json({ success: true, group: toClient(full, userId) });
    } catch (error) {
        next(error);
    }
};

// POST /groups/:groupId/join
export const joinGroup = async (req, res, next) => {
    try {
        // Fetch the group and current user ID
        const group = await Group.findById(req.params.groupId);
        const userId = req.session.user.id;

        // If the group is not found, return a 404 error
        if (!group) return res.status(404).json({ success: false, error: 'Group not found' });

        if (group.isPublic !== false) {
            // Public group: join immediately
            if (!group.members.some(member => sameId(member, userId))) {
                group.members.push(userId);
            }

            await group.save();

            // Add the group to the user's joined groups
            await User.findByIdAndUpdate(userId, { $addToSet: { joinedGroups: group._id } });

            return res.json({ success: true, status: 'joined' });
        } else {
            // Private group: add to request list
            if (group.members.some(member => sameId(member, userId))) {
                return res.status(400).json({ success: false, error: 'You are already a member of this group' });
            }

            if (!group.joinRequests.some(reqId => sameId(reqId, userId))) {
                group.joinRequests.push(userId);
            }

            await group.save();
            return res.json({ success: true, status: 'requested' });
        }
    } catch (error) {
        next(error);
    }
};

// POST /groups/:groupId/leave
export const leaveGroup = async (req, res, next) => {
    try {
        // Fetch the group and current user ID
        const group = await Group.findById(req.params.groupId);
        const userId = req.session.user.id;

        // If the group is not found, return a 404 error
        if (!group) return res.status(404).json({ success: false, error: 'Group not found' });

        // Prevent the owner from leaving the group
        if (sameId(group.owner, userId)) {
            return res.status(400).json({ success: false, error: 'The group owner cannot leave the group' });
        }

        // Remove the user from the group's members and admins
        group.members = group.members.filter(member => !sameId(member, userId));
        group.admins = group.admins.filter(admin => !sameId(admin, userId));

        // Remove the group from the user's joined and managed groups
        await User.findByIdAndUpdate(userId, {
            $pull: { joinedGroups: group._id, managedGroups: group._id }
        });

        // Delete the group if no members or admins remain
        const groupDeleted = await deleteGroupIfEmpty(group);

        if (!groupDeleted) {
            await group.save();
        }

        // Return whether the group was deleted
        res.json({ success: true, groupDeleted });
    } catch (error) {
        next(error);
    }
};

// group admin management

// POST /groups/:groupId/admins
export const addAdmin = async (req, res, next) => {
    try {
        const group = req.group;
        const username = req.body.username?.trim();

        // Validate that a username was provided
        if (!username) return res.status(400).json({ success: false, error: 'Username is required' });

        // Find the user by username
        const user = await User.findByUsername(username);

        // If the user is not found, return a 404 error
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });

        // Ensure the user is already a group member before becoming an admin
        if (!group.members.some(member => sameId(member, user._id))) {
            return res.status(400).json({ success: false, error: 'User must be a group member before becoming an admin' });
        }

        // Add the user to the admins array if not already present
        if (!group.admins.some(admin => sameId(admin, user._id))) {
            group.admins.push(user._id);
        }

        await group.save();

        // Add the group to the user's managed and joined groups
        await User.findByIdAndUpdate(user._id, {
            $addToSet: { managedGroups: group._id, joinedGroups: group._id }
        });

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

// DELETE /groups/:groupId/admins/:username
export const removeAdmin = async (req, res, next) => {
    try {
        const group = req.group;

        // Find the user by username
        const user = await User.findByUsername(req.params.username);

        // If the user is not found, return a 404 error
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });

        // Prevent the owner from being removed from admins
        if (sameId(group.owner, user._id)) {
            return res.status(400).json({ success: false, error: 'The owner cannot be removed from admins' });
        }

        // Remove the user from the group's admins
        group.admins = group.admins.filter(admin => !sameId(admin, user._id));

        // Remove the group from the user's managed groups
        await User.findByIdAndUpdate(user._id, { $pull: { managedGroups: group._id } });

        // Delete the group if no members or admins remain
        const groupDeleted = await deleteGroupIfEmpty(group);

        if (!groupDeleted) {
            await group.save();
        }

        // Return whether the group was deleted
        res.json({ success: true, groupDeleted });
    } catch (error) {
        next(error);
    }
};

// PUT /groups/:groupId
export const updateGroup = async (req, res, next) => {
    try {
        const group = req.group;

        // Destructure the fields that can be updated
        const { name, description, category, image, isPublic } = req.body;

        // Update and validate the group name if provided
        if (name !== undefined) {
            if (!name.trim()) {
                return res.status(400).json({ success: false, error: 'Group name is required' });
            }

            if (name.trim().length > 80) {
                return res.status(400).json({ success: false, error: 'Group name cannot exceed 80 characters' });
            }

            // Check if another group already exists with the same name
            const escaped = name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const duplicate = await Group.findOne({
                _id: { $ne: group._id },
                name: { $regex: `^${escaped}$`, $options: 'i' }
            });

            if (duplicate) {
                return res.status(400).json({ success: false, error: 'A group with this name already exists' });
            }

            group.name = name.trim();
        }

        // Update and validate the description if provided
        if (description !== undefined) {
            if (description.length > 500) {
                return res.status(400).json({ success: false, error: 'Description cannot exceed 500 characters' });
            }

            group.description = description.trim();
        }

        // Update the remaining group fields if provided
        if (category !== undefined) group.category = category.trim();
        if (image !== undefined) group.image = image;
        if (isPublic !== undefined) group.isPublic = Boolean(isPublic);

        await group.save();

        // Return a success response after updating the group
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

// DELETE /groups/:groupId/members/:userId
export const removeMember = async (req, res, next) => {
    try {
        const group = req.group;
        const targetId = req.params.userId;
        const currentId = req.session.user.id;

        // Prevent the group owner from being removed
        if (sameId(group.owner, targetId)) {
            return res.status(400).json({ success: false, error: 'The group owner cannot be removed' });
        }

        // Check if the selected member is also an admin
        const targetAdmin = group.admins.some(admin => sameId(admin, targetId));

        // Only the group owner can remove another admin
        if (targetAdmin && !sameId(group.owner, currentId)) {
            return res.status(403).json({ success: false, error: 'Only the group owner can remove an admin' });
        }

        // Remove the user from the group's members and admins
        group.members = group.members.filter(member => !sameId(member, targetId));
        group.admins = group.admins.filter(admin => !sameId(admin, targetId));

        // Remove the group from the user's joined and managed groups
        await User.findByIdAndUpdate(targetId, {
            $pull: { joinedGroups: group._id, managedGroups: group._id }
        });

        // Delete the group if no members or admins remain
        const groupDeleted = await deleteGroupIfEmpty(group);

        if (!groupDeleted) {
            await group.save();
        }

        // Return whether the group was deleted
        res.json({ success: true, groupDeleted });
    } catch (error) {
        next(error);
    }
};

// DELETE /groups/:groupId
// delete the group and its related posts
export const deleteGroup = async (req, res, next) => {
    try {
        const group = req.group;

        // Count the posts that will be deleted with the group
        const deletedPosts = await Post.countDocuments({ group: group._id });

        // Delete the group, its posts and all user references to it
        await deleteGroupWithPosts(group);

        // Return the number of deleted posts
        res.json({ success: true, deletedPosts });
    } catch (error) {
        next(error);
    }
};

// POST /groups/:groupId/requests/:userId/approve
export const approveRequest = async (req, res, next) => {
    try {
        const group = req.group;
        const { userId } = req.params;

        // remove from joinRequests if present
        group.joinRequests = (group.joinRequests || []).filter(id => String(id._id || id) !== String(userId));

        // add to members if not present
        if (!group.members.some(id => String(id._id || id) === String(userId))) {
            group.members.push(userId);
        }

        await group.save();

        // Add the group to the user's joined groups
        await User.findByIdAndUpdate(userId, { $addToSet: { joinedGroups: group._id } });

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

// POST /groups/:groupId/requests/:userId/reject
export const rejectRequest = async (req, res, next) => {
    try {
        const group = req.group;
        const { userId } = req.params;

        // remove from joinRequests
        group.joinRequests = (group.joinRequests || []).filter(id => String(id._id || id) !== String(userId));

        await group.save();

        // Return a success response after rejecting the request
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};