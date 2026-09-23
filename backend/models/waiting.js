const mongoose=require("mongoose");

const waitingSchema=new mongoose.Schema({

student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student"
},

name:String,

mobile:String,

email:String,

gender:String,

seatPreference:Number,

status:{

type:String,

default:"Waiting"

},

date:{

type:Date,

default:Date.now

}

});

module.exports=mongoose.models.Waiting || mongoose.model("Waiting",waitingSchema);