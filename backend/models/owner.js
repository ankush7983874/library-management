const mongoose = require("mongoose");

const ownerSchema = new mongoose.Schema(
{
    libraryName:{
        type:String,
        required:true,
        trim:true
    },

    ownerName:{
        type:String,
        required:true,
        trim:true
    },

    mobile:{
        type:String,
        required:true,
        unique:true
    },

    email:{
        type:String,
        required:true,
        unique:true
    },

    password:{
        type:String,
        required:true
    },

    logo:{
        type:String,
        default:""
    },

    address:{
        type:String,
        default:""
    },

    totalSeats:{
        type:Number,
        default:150
    },

    monthlyFee:{
        type:Number,
        default:500
    },

    openingTime:{
        type:String,
        default:"06:00 AM"
    },

    closingTime:{
        type:String,
        default:"11:00 PM"
    },

    upiId:{
        type:String,
        default:"barnalauo86@okaxis"
    },

    paymentQr:{
        type:String,
        default:""
    },

    holidays:{
        type:String,
        default:""
    },

    isVerified:{
        type:Boolean,
        default:true
    }

},
{
    timestamps: true
});

// Password Hash Pre-save Hook
ownerSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Compare Password Method
ownerSchema.methods.matchPassword = async function (enteredPassword) {
    const bcrypt = require('bcryptjs');
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.models.Owner || mongoose.model("Owner", ownerSchema);