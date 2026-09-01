import User from '../models/userModel.js';
const cityPipeline = match => [{$match:match},{$project:{city:{$let:{vars:{value:{$trim:{input:{$ifNull:['$city','']}}}},in:{$cond:[{$eq:['$$value','']},'not specified','$$value']}}}}},{$group:{_id:'$city',count:{$sum:1}}},{$project:{_id:0,city:'$_id',count:1}},{$sort:{count:-1,city:1}}];
// group the logged-in user's friends by profile city
export const getFriendsByCity = async (req, res, next) => {
    try {
        const user = await User.findById(req.session.user.id);
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });
        const friendUsernames = (user.friends || []).map(username => String(username).toLowerCase().trim());
        if (!friendUsernames.length) return res.json({ success: true, data: [], totalFriends: 0 });
        const data = await User.aggregate(cityPipeline({ username: { $in: friendUsernames } }));
        res.json({ success: true, data, totalFriends: data.reduce((sum, item) => sum + item.count, 0) });
    } catch (error) {
        next(error);
    }
};
// group members of a managed group by profile city
export const getGroupMembersByCity=async(req,res,next)=>{try{
    const group=req.group;
    const memberIds=group.members||[];
    const data=memberIds.length?await User.aggregate(cityPipeline({_id:{$in:memberIds}})):[];
    res.json({success:true,data,groupName:group.name,totalMembers:data.reduce((sum,item)=>sum+item.count,0)});
}catch(error){next(error);}};
