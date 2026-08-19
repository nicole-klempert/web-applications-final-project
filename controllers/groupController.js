import Group from '../models/groupModel.js';
import User from '../models/userModel.js';
import Post from '../models/postModel.js';


// compare MongoDB IDs safely
const sameId = (firstId, secondId) => {
    if (!firstId || !secondId) return false;

    const first =
        firstId._id
            ? firstId._id.toString()
            : firstId.toString();

    const second =
        secondId._id
            ? secondId._id.toString()
            : secondId.toString();

    return first === second;
};


// turn populated user into safe frontend data
const prepareUser = (user) => {
    if (!user) return null;

    return {
        _id: user._id,
        username: user.username || 'User',
        profilePicture: user.profilePicture || ''
    };
};


// prepare group for frontend
const prepareGroupForUser = (group, currentUserId) => {

    const ownerId =
        group.owner?._id || group.owner;

    const adminIds =
        (group.admins || []).map(
            admin => admin?._id || admin
        );

    const memberIds =
        (group.members || []).map(
            member => member?._id || member
        );


    return {
        _id: group._id,

        name: group.name,

        description:
            group.description || '',

        category:
            group.category || '',

        image:
            group.image || '',

        address:
            group.address || '',

        city:
            group.city || '',

        latitude:
            group.latitude ?? null,

        longitude:
            group.longitude ?? null,

        createdAt:
            group.createdAt,

        updatedAt:
            group.updatedAt,

        owner:
            prepareUser(group.owner),

        admins:
            (group.admins || [])
                .map(prepareUser)
                .filter(Boolean),

        members:
            (group.members || [])
                .map(prepareUser)
                .filter(Boolean),

        memberCount:
            memberIds.length,

        isOwner:
            sameId(
                ownerId,
                currentUserId
            ),

        isAdmin:
            adminIds.some(
                adminId =>
                    sameId(
                        adminId,
                        currentUserId
                    )
            ),

        isMember:
            memberIds.some(
                memberId =>
                    sameId(
                        memberId,
                        currentUserId
                    )
            )
    };
};


// GET /groups
export const getGroups = async (req, res, next) => {

    try {

        const currentUserId =
            req.session.user.id;


        const page =
            Math.max(
                parseInt(req.query.page) || 1,
                1
            );


        const requestedLimit =
            parseInt(req.query.limit) || 6;


        const limit =
            Math.min(
                Math.max(requestedLimit, 1),
                20
            );


        const skip =
            (page - 1) * limit;


        const query = {};


        // search name / description
        if (
            req.query.search &&
            req.query.search.trim()
        ) {

            const escapedSearch =
                req.query.search
                    .trim()
                    .replace(
                        /[.*+?^${}()|[\]\\]/g,
                        '\\$&'
                    );


            const regex =
                new RegExp(
                    escapedSearch,
                    'i'
                );


            query.$or = [
                { name: regex },
                { description: regex }
            ];
        }


        // category filter
        if (
            req.query.category &&
            req.query.category.trim()
        ) {

            query.category =
                req.query.category.trim();
        }


        // city filter
        if (
            req.query.city &&
            req.query.city.trim()
        ) {

            const escapedCity =
                req.query.city
                    .trim()
                    .replace(
                        /[.*+?^${}()|[\]\\]/g,
                        '\\$&'
                    );


            query.city =
                new RegExp(
                    `^${escapedCity}$`,
                    'i'
                );
        }


        const totalGroups =
            await Group.countDocuments(
                query
            );


        const groups =
            await Group.find(query)
                .populate('owner')
                .populate('admins')
                .populate('members')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);


        const preparedGroups =
            groups.map(group =>
                prepareGroupForUser(
                    group,
                    currentUserId
                )
            );


        const totalPages =
            Math.ceil(
                totalGroups / limit
            );


        return res.status(200).json({

            success: true,

            groups:
                preparedGroups,

            currentPage:
                page,

            totalPages,

            totalGroups,

            hasMore:
                page < totalPages
        });

    } catch (error) {
        next(error);
    }
};


// GET /groups/:groupId
export const getGroupById = async (req, res, next) => {

    try {

        const currentUserId =
            req.session.user.id;


        const group =
            await Group.findById(
                req.params.groupId
            )
                .populate('owner')
                .populate('admins')
                .populate('members');


        if (!group) {

            return res.status(404).json({
                success: false,
                error: 'Group not found'
            });
        }


        return res.status(200).json({

            success: true,

            group:
                prepareGroupForUser(
                    group,
                    currentUserId
                )
        });

    } catch (error) {
        next(error);
    }
};


// POST /groups
export const createGroup = async (req, res, next) => {

    try {

        const {
            name,
            description = '',
            category = '',
            image = '',
            address = '',
            city = '',
            latitude = null,
            longitude = null
        } = req.body;


        const currentUserId =
            req.session.user.id;


        if (!name || !name.trim()) {

            return res.status(400).json({
                success: false,
                error: 'Group name is required'
            });
        }


        if (name.trim().length > 80) {

            return res.status(400).json({
                success: false,
                error:
                    'Group name cannot exceed 80 characters'
            });
        }


        if (
            description &&
            description.length > 500
        ) {

            return res.status(400).json({
                success: false,
                error:
                    'Description cannot exceed 500 characters'
            });
        }


        const escapedName =
            name
                .trim()
                .replace(
                    /[.*+?^${}()|[\]\\]/g,
                    '\\$&'
                );


        const existingGroup =
            await Group.findOne({

                name: {
                    $regex:
                        `^${escapedName}$`,

                    $options:
                        'i'
                }
            });


        if (existingGroup) {

            return res.status(400).json({
                success: false,
                error:
                    'A group with this name already exists'
            });
        }


        const parsedLatitude =
            latitude === null ||
                latitude === ''
                ? null
                : Number(latitude);


        const parsedLongitude =
            longitude === null ||
                longitude === ''
                ? null
                : Number(longitude);


        if (
            parsedLatitude !== null &&
            (
                Number.isNaN(parsedLatitude) ||
                parsedLatitude < -90 ||
                parsedLatitude > 90
            )
        ) {

            return res.status(400).json({
                success: false,
                error:
                    'Latitude must be between -90 and 90'
            });
        }


        if (
            parsedLongitude !== null &&
            (
                Number.isNaN(parsedLongitude) ||
                parsedLongitude < -180 ||
                parsedLongitude > 180
            )
        ) {

            return res.status(400).json({
                success: false,
                error:
                    'Longitude must be between -180 and 180'
            });
        }


        const newGroup =
            new Group({

                name:
                    name.trim(),

                description:
                    description.trim(),

                category:
                    category.trim(),

                image,

                owner:
                    currentUserId,

                admins: [
                    currentUserId
                ],

                members: [
                    currentUserId
                ],

                address:
                    address.trim(),

                city:
                    city.trim(),

                latitude:
                    parsedLatitude,

                longitude:
                    parsedLongitude
            });


        const savedGroup =
            await newGroup.save();


        return res.status(201).json({
            success: true,
            groupId: savedGroup._id
        });

    } catch (error) {
        next(error);
    }
};


// POST /groups/:groupId/join
export const joinGroup = async (req, res, next) => {

    try {

        const currentUserId =
            req.session.user.id;


        const group =
            await Group.findById(
                req.params.groupId
            );


        if (!group) {

            return res.status(404).json({
                success: false,
                error: 'Group not found'
            });
        }


        const alreadyMember =
            group.members.some(
                member =>
                    sameId(
                        member,
                        currentUserId
                    )
            );


        if (!alreadyMember) {

            group.members.push(
                currentUserId
            );

            await group.save();
        }


        return res.status(200).json({
            success: true
        });

    } catch (error) {
        next(error);
    }
};


// POST /groups/:groupId/leave
export const leaveGroup = async (req, res, next) => {

    try {

        const currentUserId =
            req.session.user.id;


        const group =
            await Group.findById(
                req.params.groupId
            );


        if (!group) {

            return res.status(404).json({
                success: false,
                error: 'Group not found'
            });
        }


        // owner cannot leave
        if (
            sameId(
                group.owner,
                currentUserId
            )
        ) {

            return res.status(400).json({
                success: false,
                error:
                    'Group owner cannot leave the group'
            });
        }


        group.members =
            group.members.filter(
                member =>
                    !sameId(
                        member,
                        currentUserId
                    )
            );


        group.admins =
            group.admins.filter(
                admin =>
                    !sameId(
                        admin,
                        currentUserId
                    )
            );


        await group.save();


        return res.status(200).json({
            success: true
        });

    } catch (error) {
        next(error);
    }
};


// POST /groups/:groupId/admins
// OWNER ONLY
export const addAdmin = async (req, res, next) => {

    try {

        const { username } =
            req.body;


        const group =
            req.group;


        if (
            !username ||
            !username.trim()
        ) {

            return res.status(400).json({
                success: false,
                error: 'Username is required'
            });
        }


        const targetUser =
            await User.findByUsername(
                username.trim()
            );


        if (!targetUser) {

            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }


        const isMember =
            group.members.some(
                member =>
                    sameId(
                        member,
                        targetUser._id
                    )
            );


        if (!isMember) {

            return res.status(400).json({
                success: false,
                error:
                    'User must be a group member before becoming an admin'
            });
        }


        const alreadyAdmin =
            group.admins.some(
                admin =>
                    sameId(
                        admin,
                        targetUser._id
                    )
            );


        if (!alreadyAdmin) {

            group.admins.push(
                targetUser._id
            );

            await group.save();
        }


        return res.status(200).json({
            success: true
        });

    } catch (error) {
        next(error);
    }
};


// DELETE /groups/:groupId/admins/:username
// OWNER ONLY
export const removeAdmin = async (req, res, next) => {

    try {

        const group =
            req.group;


        const targetUser =
            await User.findByUsername(
                req.params.username
            );


        if (!targetUser) {

            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }


        if (
            sameId(
                group.owner,
                targetUser._id
            )
        ) {

            return res.status(400).json({
                success: false,
                error:
                    'The owner cannot be removed from admins'
            });
        }


        group.admins =
            group.admins.filter(
                admin =>
                    !sameId(
                        admin,
                        targetUser._id
                    )
            );


        await group.save();


        return res.status(200).json({
            success: true
        });

    } catch (error) {
        next(error);
    }
};


// PUT /groups/:groupId
// OWNER OR ADMIN
export const updateGroup = async (req, res, next) => {

    try {

        const group =
            req.group;


        const {
            name,
            description,
            category,
            image,
            address,
            city,
            latitude,
            longitude
        } = req.body;


        if (name !== undefined) {

            if (!name.trim()) {

                return res.status(400).json({
                    success: false,
                    error: 'Group name is required'
                });
            }


            if (
                name.trim().length > 80
            ) {

                return res.status(400).json({
                    success: false,
                    error:
                        'Group name cannot exceed 80 characters'
                });
            }


            group.name =
                name.trim();
        }


        if (
            description !== undefined
        ) {

            if (
                description.length > 500
            ) {

                return res.status(400).json({
                    success: false,
                    error:
                        'Description cannot exceed 500 characters'
                });
            }


            group.description =
                description.trim();
        }


        if (
            category !== undefined
        ) {

            group.category =
                category.trim();
        }


        if (
            image !== undefined
        ) {

            group.image =
                image;
        }


        if (
            address !== undefined
        ) {

            group.address =
                address.trim();
        }


        if (
            city !== undefined
        ) {

            group.city =
                city.trim();
        }


        if (
            latitude !== undefined
        ) {

            if (
                latitude === null ||
                latitude === ''
            ) {

                group.latitude =
                    null;

            } else {

                const parsed =
                    Number(latitude);


                if (
                    Number.isNaN(parsed) ||
                    parsed < -90 ||
                    parsed > 90
                ) {

                    return res.status(400).json({
                        success: false,
                        error:
                            'Latitude must be between -90 and 90'
                    });
                }


                group.latitude =
                    parsed;
            }
        }


        if (
            longitude !== undefined
        ) {

            if (
                longitude === null ||
                longitude === ''
            ) {

                group.longitude =
                    null;

            } else {

                const parsed =
                    Number(longitude);


                if (
                    Number.isNaN(parsed) ||
                    parsed < -180 ||
                    parsed > 180
                ) {

                    return res.status(400).json({
                        success: false,
                        error:
                            'Longitude must be between -180 and 180'
                    });
                }


                group.longitude =
                    parsed;
            }
        }


        await group.save();


        return res.status(200).json({
            success: true
        });

    } catch (error) {
        next(error);
    }
};


// DELETE /groups/:groupId/members/:userId
// OWNER OR ADMIN
export const removeMember = async (req, res, next) => {

    try {

        const group =
            req.group;


        const currentUserId =
            req.session.user.id;


        const targetUserId =
            req.params.userId;


        // owner can never be removed
        if (
            sameId(
                group.owner,
                targetUserId
            )
        ) {

            return res.status(400).json({
                success: false,
                error:
                    'The group owner cannot be removed'
            });
        }


        const targetIsAdmin =
            group.admins.some(
                admin =>
                    sameId(
                        admin,
                        targetUserId
                    )
            );


        const currentUserIsOwner =
            sameId(
                group.owner,
                currentUserId
            );


        /*
         * only owner may remove another admin,
         * because removing an admin also changes
         * their admin status
         */
        if (
            targetIsAdmin &&
            !currentUserIsOwner
        ) {

            return res.status(403).json({
                success: false,
                error:
                    'Only the group owner can remove an admin'
            });
        }


        group.members =
            group.members.filter(
                member =>
                    !sameId(
                        member,
                        targetUserId
                    )
            );


        group.admins =
            group.admins.filter(
                admin =>
                    !sameId(
                        admin,
                        targetUserId
                    )
            );


        await group.save();


        return res.status(200).json({
            success: true
        });

    } catch (error) {
        next(error);
    }
};

// DELETE /groups/:groupId
// OWNER OR ADMIN
// deleting a group also deletes all posts that belong to it
export const deleteGroup = async (req, res, next) => {

    try {

        const groupId =
            req.group._id;


        console.log(
            "[Delete Group] Group ID:",
            groupId.toString()
        );


        // delete all posts that belong to this group
        const deletePostsResult =
            await Post.deleteMany({
                group: groupId
            });


        console.log(
            "[Delete Group] Deleted posts:",
            deletePostsResult.deletedCount
        );


        // delete the group itself
        await Group.findByIdAndDelete(
            groupId
        );


        console.log(
            "[Delete Group] Group deleted"
        );


        return res.status(200).json({
            success: true,
            deletedPosts:
                deletePostsResult.deletedCount
        });

    } catch (error) {

        console.error(
            "[Delete Group Error]:",
            error
        );

        next(error);
    }
};