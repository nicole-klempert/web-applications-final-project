import User from '../models/userModel.js';
import Group from '../models/groupModel.js';
import Post from '../models/postModel.js';

// get profile post and group statistics
export const getProfileStats=async(req,res,next)=>{try{
    const user=await User.findByUsername(req.params.username);
    if(!user)return res.status(404).json({success:false,error:'User not found'});
    const isOwn=String(user._id)===String(req.session.user.id);
    const base={$or:[{owner:user._id},{admins:user._id},{members:user._id}]};
    const groupQuery=isOwn?base:{$and:[base,{$or:[{isPublic:true},{isPublic:{$exists:false}}]}]};
    const groups=await Group.find(groupQuery).populate('owner').sort({createdAt:-1});
    const managedGroups=[],memberGroups=[];
    groups.forEach(group=>{
        const managed=String(group.owner?._id||group.owner)===String(user._id)||(group.admins||[]).some(id=>String(id._id||id)===String(user._id));
        const item={_id:group._id,name:group.name,description:group.description||'',image:group.image||'',city:group.city||'',category:group.category||'',memberCount:(group.members||[]).length,isPublic:group.isPublic!==false};
        if(managed)managedGroups.push(item);else memberGroups.push(item);
    });
    const postCount=await Post.countDocuments({author:new RegExp(`^${user.username.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}$`,'i')});
    res.json({success:true,stats:{postCount,groupCount:managedGroups.length+memberGroups.length,managedGroups,memberGroups}});
}catch(error){next(error);}};
