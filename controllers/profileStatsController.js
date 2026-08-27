import Group from '../models/groupModel.js';
import Post from '../models/postModel.js';
import User from '../models/userModel.js';


// GET /profile-stats
export const getProfileStats = async (req, res, next) => {
    try {
        const { username } =
            req.params;
        // find the requested user
        const user =
            await User.findByUsername(
                username
            );
        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found"
            });
        }

        /*
         * Find every group where the user is a member.
         *
         * The Group model already guarantees that
         * owners and admins are also members.
         */
        const loggedInUserId = req.session.user.id;

        const isOwnProfile =
            loggedInUserId.toString() === user._id.toString();

        const groupQuery = {
            members: user._id
        };

        // when viewing another user's profile, show only public groups
        if (!isOwnProfile) {
            groupQuery.$or = [
                { isPublic: true },
                { isPublic: { $exists: false } }
            ];
        }

        const groups =
            await Group.find(groupQuery)
                .populate("owner")
                .populate("admins")
                .sort({ createdAt: -1 });


        /*
         * Groups managed by the user:
         * user is either owner or admin.
         */
        const managedGroups = [];


        /*
         * Groups where the user is only a regular member.
         */
        const memberGroups = [];


        groups.forEach(group => {

            const ownerId =
                group.owner?._id
                    ? group.owner._id.toString()
                    : group.owner?.toString();


            const isOwner =
                ownerId ===
                user._id.toString();


            const isAdmin =
                (group.admins || [])
                    .some(admin => {

                        const adminId =
                            admin?._id
                                ? admin._id.toString()
                                : admin?.toString();


                        return (
                            adminId ===
                            user._id.toString()
                        );
                    });


            const preparedGroup = {
                _id:
                    group._id,
                name:
                    group.name,
                description:
                    group.description || "",
                category:
                    group.category || "",
                city:
                    group.city || "",
                image:
                    group.image || "",
                memberCount:
                    Array.isArray(
                        group.members
                    )
                        ? group.members.length
                        : 0,
                role:
                    isOwner
                        ? "Owner"
                        : isAdmin
                            ? "Admin"
                            : "Member"
            };
            if (
                isOwner ||
                isAdmin
            ) {
                managedGroups.push(
                    preparedGroup
                );
            } else {
                memberGroups.push(
                    preparedGroup
                );
            }
        });

        /*
         * Count ALL posts created by this user.
         *
         * This includes regular Feed posts
         * and posts created inside groups.
         */
        const escapedUsername =
            username
                .trim()
                .replace(
                    /[.*+?^${}()|[\]\\]/g,
                    "\\$&"
                );


        const postsCount =
            await Post.countDocuments({

                author: {
                    $regex:
                        `^${escapedUsername}$`,

                    $options:
                        "i"
                }
            });


        return res.status(200).json({
            success: true,
            stats: {
                postsCount,
                groupsCount:
                    groups.length
            },
            managedGroups,
            memberGroups
        });
    } catch (error) {

        next(error);
    }
};