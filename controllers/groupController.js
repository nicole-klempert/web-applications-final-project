// JavaScript source code
import Group from '../models/groupModel.js';
import User from '../models/userModel.js';
import Post from '../models/postModel.js';
// group helpers
const sameId=(a,b)=>Boolean(a&&b&&String(a._id||a)===String(b._id||b));
const safeUser=user=>user?{_id:user._id,username:user.username||'User',profilePicture:user.profilePicture||''}:null;
const toClient=(group,currentUserId)=>{
    const ownerId=group.owner?._id||group.owner;
    const adminIds=(group.admins||[]).map(v=>v?._id||v);
    const memberIds=(group.members||[]).map(v=>v?._id||v);
    return {_id:group._id,name:group.name,description:group.description||'',category:group.category||'',image:group.image||'',isPublic:group.isPublic!==false,createdAt:group.createdAt,updatedAt:group.updatedAt,owner:safeUser(group.owner),admins:(group.admins||[]).map(safeUser).filter(Boolean),members:(group.members||[]).map(safeUser).filter(Boolean),memberCount:memberIds.length,isOwner:sameId(ownerId,currentUserId),isAdmin:adminIds.some(id=>sameId(id,currentUserId)),isMember:memberIds.some(id=>sameId(id,currentUserId))};
};
const populatedGroup=id=>Group.findById(id).populate('owner').populate('admins').populate('members');
// get groups with filters and pagination
export const getGroups=async(req,res,next)=>{try{
    const page=Math.max(parseInt(req.query.page)||1,1),limit=Math.min(Math.max(parseInt(req.query.limit)||6,1),50),skip=(page-1)*limit;
    const query={$and:[{$or:[{isPublic:{$ne:false}},{members:req.session.user.id}]}]};
    if(req.query.search?.trim()){const r=new RegExp(req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'i');query.$and.push({$or:[{name:r},{description:r}]});}
    if(req.query.category?.trim())query.$and.push({category:req.query.category.trim()});
    if(req.query.publicOnly==='true')query.$and.push({isPublic:{$ne:false}});
    const totalGroups=await Group.countDocuments(query);
    const groups=await Group.find(query).populate('owner').populate('admins').populate('members').sort({createdAt:-1}).skip(skip).limit(limit);
    const totalPages=Math.ceil(totalGroups/limit);
    res.json({success:true,groups:groups.map(g=>toClient(g,req.session.user.id)),currentPage:page,totalPages,totalGroups,hasMore:page<totalPages});
}catch(error){next(error);}};
export const getGroupById=async(req,res,next)=>{try{
    const group=await populatedGroup(req.params.groupId);
    if(!group)return res.status(404).json({success:false,error:'Group not found'});
    const prepared=toClient(group,req.session.user.id);
    if(!prepared.isPublic&&!prepared.isMember)return res.status(403).json({success:false,error:'This group is private'});
    res.json({success:true,group:prepared});
}catch(error){next(error);}};
// create a group and add the owner as a member and admin
export const createGroup=async(req,res,next)=>{try{
    const {name,description='',category='',image='',isPublic=true}=req.body;
    if(!name?.trim())return res.status(400).json({success:false,error:'Group name is required'});
    if(name.trim().length>80)return res.status(400).json({success:false,error:'Group name cannot exceed 80 characters'});
    if(description.length>500)return res.status(400).json({success:false,error:'Description cannot exceed 500 characters'});
    const escaped=name.trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    if(await Group.findOne({name:{$regex:`^${escaped}$`,$options:'i'}}))return res.status(400).json({success:false,error:'A group with this name already exists'});
    const userId=req.session.user.id;
    const group=await Group.create({name:name.trim(),description:description.trim(),category:category.trim(),image,isPublic:isPublic!==false,owner:userId,admins:[userId],members:[userId]});
    await User.findByIdAndUpdate(userId,{$addToSet:{managedGroups:group._id,joinedGroups:group._id}});
    const full=await populatedGroup(group._id);
    res.status(201).json({success:true,group:toClient(full,userId)});
}catch(error){next(error);}};
export const joinGroup=async(req,res,next)=>{try{
    const group=await Group.findById(req.params.groupId),userId=req.session.user.id;
    if(!group)return res.status(404).json({success:false,error:'Group not found'});
    if(!group.members.some(m=>sameId(m,userId)))group.members.push(userId);
    await group.save();
    await User.findByIdAndUpdate(userId,{$addToSet:{joinedGroups:group._id}});
    res.json({success:true});
}catch(error){next(error);}};
export const leaveGroup=async(req,res,next)=>{try{
    const group=await Group.findById(req.params.groupId),userId=req.session.user.id;
    if(!group)return res.status(404).json({success:false,error:'Group not found'});
    if(sameId(group.owner,userId))return res.status(400).json({success:false,error:'The group owner cannot leave the group'});
    group.members=group.members.filter(m=>!sameId(m,userId));
    group.admins=group.admins.filter(a=>!sameId(a,userId));
    await group.save();
    await User.findByIdAndUpdate(userId,{$pull:{joinedGroups:group._id,managedGroups:group._id}});
    res.json({success:true});
}catch(error){next(error);}};
// group admin management
export const addAdmin=async(req,res,next)=>{try{
    const group=req.group,username=req.body.username?.trim();
    if(!username)return res.status(400).json({success:false,error:'Username is required'});
    const user=await User.findByUsername(username);
    if(!user)return res.status(404).json({success:false,error:'User not found'});
    if(!group.members.some(m=>sameId(m,user._id)))return res.status(400).json({success:false,error:'User must be a group member before becoming an admin'});
    if(!group.admins.some(a=>sameId(a,user._id)))group.admins.push(user._id);
    await group.save();
    await User.findByIdAndUpdate(user._id,{$addToSet:{managedGroups:group._id,joinedGroups:group._id}});
    res.json({success:true});
}catch(error){next(error);}};
export const removeAdmin=async(req,res,next)=>{try{
    const group=req.group,user=await User.findByUsername(req.params.username);
    if(!user)return res.status(404).json({success:false,error:'User not found'});
    if(sameId(group.owner,user._id))return res.status(400).json({success:false,error:'The owner cannot be removed from admins'});
    group.admins=group.admins.filter(a=>!sameId(a,user._id));
    await group.save();
    await User.findByIdAndUpdate(user._id,{$pull:{managedGroups:group._id}});
    res.json({success:true});
}catch(error){next(error);}};
export const updateGroup=async(req,res,next)=>{try{
    const group=req.group;
    const {name,description,category,image,isPublic}=req.body;
    if(name!==undefined){if(!name.trim())return res.status(400).json({success:false,error:'Group name is required'});if(name.trim().length>80)return res.status(400).json({success:false,error:'Group name cannot exceed 80 characters'});const escaped=name.trim().replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const duplicate=await Group.findOne({_id:{$ne:group._id},name:{$regex:`^${escaped}$`,$options:'i'}});if(duplicate)return res.status(400).json({success:false,error:'A group with this name already exists'});group.name=name.trim();}
    if(description!==undefined){if(description.length>500)return res.status(400).json({success:false,error:'Description cannot exceed 500 characters'});group.description=description.trim();}
    if(category!==undefined)group.category=category.trim();
    if(image!==undefined)group.image=image;
    if(isPublic!==undefined)group.isPublic=Boolean(isPublic);
    await group.save();
    res.json({success:true});
}catch(error){next(error);}};
export const removeMember=async(req,res,next)=>{try{
    const group=req.group,targetId=req.params.userId,currentId=req.session.user.id;
    if(sameId(group.owner,targetId))return res.status(400).json({success:false,error:'The group owner cannot be removed'});
    const targetAdmin=group.admins.some(a=>sameId(a,targetId));
    if(targetAdmin&&!sameId(group.owner,currentId))return res.status(403).json({success:false,error:'Only the group owner can remove an admin'});
    group.members=group.members.filter(m=>!sameId(m,targetId));
    group.admins=group.admins.filter(a=>!sameId(a,targetId));
    await group.save();
    await User.findByIdAndUpdate(targetId,{$pull:{joinedGroups:group._id,managedGroups:group._id}});
    res.json({success:true});
}catch(error){next(error);}};
// delete the group and its related posts
export const deleteGroup=async(req,res,next)=>{try{
    const groupId=req.group._id;
    const deletedPosts=await Post.deleteMany({group:groupId});
    await User.updateMany({$or:[{joinedGroups:groupId},{managedGroups:groupId}]},{$pull:{joinedGroups:groupId,managedGroups:groupId}});
    await Group.deleteOne({_id:groupId});
    res.json({success:true,deletedPosts:deletedPosts.deletedCount});
}catch(error){next(error);}};
