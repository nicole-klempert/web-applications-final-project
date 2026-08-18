import mongoose from 'mongoose';

const groupSchema = new mongoose.Schema({

    // group name
    name: {
        type: String,
        required: [true, 'Group name is required'],
        trim: true
    },

    // group description
    description: {
        type: String,
        default: '',
        trim: true
    },

    // group category
    category: {
        type: String,
        default: '',
        trim: true
    },

    // group image - Base64 or URL
    image: {
        type: String,
        default: ''
    },

    // user who created/owns the group
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // additional group administrators
    admins: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    // all users who belong to the group
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

    // physical address
    address: {
        type: String,
        default: '',
        trim: true
    },

    // city
    city: {
        type: String,
        default: '',
        trim: true
    },

    // geographical coordinates
    latitude: {
        type: Number,
        default: null,
        min: -90,
        max: 90
    },

    longitude: {
        type: Number,
        default: null,
        min: -180,
        max: 180
    }

}, {
    // automatically creates createdAt and updatedAt
    timestamps: true
});


// === VALIDATION ===

// make sure the owner and all admins are also members
groupSchema.pre('validate', function (next) {

    const getId = (value) => {
        if (!value) return null;

        if (value._id) {
            return value._id.toString();
        }

        return value.toString();
    };


    if (!Array.isArray(this.members)) {
        this.members = [];
    }

    if (!Array.isArray(this.admins)) {
        this.admins = [];
    }


    // owner must always be a member
    if (this.owner) {

        const ownerId = getId(this.owner);

        const ownerIsMember = this.members.some(
            member => getId(member) === ownerId
        );

        if (!ownerIsMember) {
            this.members.push(this.owner);
        }


        // owner should also always be an admin
        const ownerIsAdmin = this.admins.some(
            admin => getId(admin) === ownerId
        );

        if (!ownerIsAdmin) {
            this.admins.push(this.owner);
        }
    }


    // every admin must also be a member
    this.admins.forEach(admin => {

        const adminId = getId(admin);

        const adminIsMember = this.members.some(
            member => getId(member) === adminId
        );

        if (!adminIsMember) {
            this.members.push(admin);
        }
    });


    next();
});


// === INDEXES ===

// required indexes
groupSchema.index({ name: 1 });
groupSchema.index({ category: 1 });
groupSchema.index({ city: 1 });

// useful for displaying newest groups first
groupSchema.index({ createdAt: -1 });


const Group = mongoose.model('Group', groupSchema);

export default Group;