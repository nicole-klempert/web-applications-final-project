import express from 'express';

import {
    getGroups,
    getGroupById,
    createGroup,
    joinGroup,
    leaveGroup,
    addAdmin,
    removeAdmin,
    updateGroup,
    removeMember,
    deleteGroup
} from '../controllers/groupController.js';

import {
    getPostsPerGroup,
    getMembersPerCity
} from '../controllers/statisticsController.js';

import {
    isAuthenticated,
    isGroupAdmin,
    isGroupOwner
} from '../middleware/authMiddleware.js';


const router =
    express.Router();


// every groups route requires login
router.use(
    isAuthenticated
);


// list groups
router.get(
    '/',
    getGroups
);


// create group
router.post(
    '/',
    createGroup
);


// ==================================================
// GROUP STATISTICS / AGGREGATIONS
// ==================================================

// Aggregation 1:
// number of posts in each group
router.get(
    '/statistics/posts-per-group',
    getPostsPerGroup
);


// Aggregation 2:
// number of unique group members in each city
router.get(
    '/statistics/members-per-city',
    getMembersPerCity
);


// get one group
router.get(
    '/:groupId',
    getGroupById
);


// join
router.post(
    '/:groupId/join',
    joinGroup
);


// leave
router.post(
    '/:groupId/leave',
    leaveGroup
);


// edit group - owner OR admin
router.put(
    '/:groupId',
    isGroupAdmin,
    updateGroup
);


// add admin - OWNER ONLY
router.post(
    '/:groupId/admins',
    isGroupOwner,
    addAdmin
);


// remove admin - OWNER ONLY
router.delete(
    '/:groupId/admins/:username',
    isGroupOwner,
    removeAdmin
);


// remove member - owner OR admin
router.delete(
    '/:groupId/members/:userId',
    isGroupAdmin,
    removeMember
);


// delete group - owner OR admin
router.delete(
    '/:groupId',
    isGroupAdmin,
    deleteGroup
);


export default router;