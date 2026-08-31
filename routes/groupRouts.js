// JavaScript source code
import express from 'express';
import {getGroups,getGroupById,createGroup,joinGroup,leaveGroup,addAdmin,removeAdmin,updateGroup,removeMember,deleteGroup,approveRequest,rejectRequest} from '../controllers/groupController.js';
import {isAuthenticated,isGroupAdmin,isGroupOwner} from '../middleware/authMiddleware.js';
const router=express.Router();
router.use(isAuthenticated);
// group endpoints
router.get('/',getGroups);
router.post('/',createGroup);
router.get('/:groupId',getGroupById);
router.post('/:groupId/join',joinGroup);
router.post('/:groupId/leave',leaveGroup);
router.put('/:groupId',isGroupAdmin,updateGroup);
router.post('/:groupId/admins',isGroupOwner,addAdmin);
router.delete('/:groupId/admins/:username',isGroupOwner,removeAdmin);
router.delete('/:groupId/members/:userId',isGroupAdmin,removeMember);
router.post('/:groupId/requests/:userId/approve',isGroupAdmin,approveRequest);
router.post('/:groupId/requests/:userId/reject',isGroupAdmin,rejectRequest);
router.delete('/:groupId',isGroupAdmin,deleteGroup);
export default router;
