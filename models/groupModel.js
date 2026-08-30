// JavaScript source code
import mongoose from 'mongoose';
// group schema
const groupSchema=new mongoose.Schema({
    name:{type:String,required:[true,'Group name is required'],trim:true,maxlength:80},
    description:{type:String,default:'',trim:true,maxlength:500},
    category:{type:String,default:'',trim:true},
    image:{type:String,default:''},
    owner:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
    admins:[{type:mongoose.Schema.Types.ObjectId,ref:'User'}],
    members:[{type:mongoose.Schema.Types.ObjectId,ref:'User'}],
    joinRequests:[{type:mongoose.Schema.Types.ObjectId,ref:'User'}],
    isPublic:{type:Boolean,default:true}
},{timestamps:true});
const idOf=value=>value?String(value._id||value):'';
// keep the owner and admins in the members list
groupSchema.pre('validate',function(next){
    this.members=Array.isArray(this.members)?this.members:[];
    this.admins=Array.isArray(this.admins)?this.admins:[];
    if(this.owner){
        const ownerId=idOf(this.owner);
        if(!this.members.some(member=>idOf(member)===ownerId))this.members.push(this.owner);
        if(!this.admins.some(admin=>idOf(admin)===ownerId))this.admins.push(this.owner);
    }
    this.admins.forEach(admin=>{if(!this.members.some(member=>idOf(member)===idOf(admin)))this.members.push(admin);});
    next();
});
groupSchema.index({name:1});
groupSchema.index({category:1});
groupSchema.index({createdAt:-1});
const Group=mongoose.model('Group',groupSchema);
export default Group;
