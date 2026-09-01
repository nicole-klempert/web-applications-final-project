import mongoose from 'mongoose';

// group schema
const groupSchema = new mongoose.Schema({
    // group name, required, max length 80
    name: {
        type: String,
        required: [true, 'Group name is required'],
        trim: true,
        maxlength: 80
    },

    // group description, optional, max length 500
    description: {
        type: String,
        default: '',
        trim: true,
        maxlength: 500
    },

    // group category, optional, max length 50
    category: {
        type: String,
        default: '',
        trim: true
    },

    // group image URL, optional
    image: {
        type: String,
        default: ''
    },

    // group owner, required, references User model
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // group admins, optional, references User model
    admins: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    // group members, optional, references User model
    members: [{
        type: mongoose.Schema.Types.ObjectId, ref: 'User'
    }],

    // group join requests, optional, references User model
    joinRequests: [{
        type: mongoose.Schema.Types.ObjectId, ref: 'User'
    }],

    // group privacy setting, default is public
    isPublic: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// helper function to get the string representation of an ObjectId or string
const idOf = value => value ? String(value._id || value) : '';

// keep the owner and admins in the members list
groupSchema.pre('validate', function (next) {

    // collect members and admins as arrays, even if they are not provided as arrays
    this.members=Array.isArray(this.members)?this.members:[];
    this.admins = Array.isArray(this.admins) ? this.admins : [];

    // ensure the owner is in the members and admins lists
    if (this.owner) {

        const ownerId = idOf(this.owner);

        // add owner to members and admins if not already present
        if (!this.members.some(member => idOf(member) === ownerId)) {
            this.members.push(this.owner);
        }

        // add owner to admins if not already present
        if (!this.admins.some(admin => idOf(admin) === ownerId)) {
            this.admins.push(this.owner);
        }
    }
    this.admins.forEach(admin => {

        // add each admin to members if not already present
        if (!this.members.some(member => idOf(member) === idOf(admin))) {
            this.members.push(admin);
        }
    });
    next();
});

// indexes for efficient searching and sorting
groupSchema.index({name:1});
groupSchema.index({category:1});
groupSchema.index({ createdAt: -1 });

const Group = mongoose.model('Group', groupSchema);

export default Group;
