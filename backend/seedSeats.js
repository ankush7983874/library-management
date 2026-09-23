const dotenv = require("dotenv");
const mongoose = require("mongoose");
const Seat = require("./models/Seat");

dotenv.config();

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ MongoDB Connected");

    // Purani seats delete karega
    await Seat.deleteMany({});

    let seats = [];

    for (let i = 1; i <= 150; i++) {
      seats.push({
        seatNumber: i,
        status: "Available",
        student: null,
        bookingDate: null,
        expiryDate: null,
        monthlyFee: 500
      });
    }

    await Seat.insertMany(seats);

    console.log("🎉 150 Seats Created Successfully");

    mongoose.connection.close();
  })
  .catch((err) => {
    console.log(err.message);
  });