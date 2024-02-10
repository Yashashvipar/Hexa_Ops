require("dotenv").config();
const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const twilio = require("twilio");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = twilio(accountSid, authToken);
const otpMap = new Map();

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

app.use(express.static("public"));

io.on("connection", (socket) => {
    socket.on("verifyGovernmentPassword", (governmentPassword) => {
        // Check if government password matches the expected value
        const expectedGovernmentPassword = process.env.EXPECTED_GOVERNMENT_PASSWORD;

        if (governmentPassword === expectedGovernmentPassword) {
            // Government password is valid
            socket.emit("governmentPasswordValid");
        } else {
            // Government password is invalid
            socket.emit("governmentPasswordInvalid");
        }
    });

    socket.on("generateOTP", () => {
        const otp = Math.floor(1000 + Math.random() * 9000);
        const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

        twilioClient.messages
            .create({
                to: phoneNumber,
                from: "+17144895923",
                body: `Your OTP is: ${otp}`,
            })
            .then((message) => {
                console.log(`OTP sent: ${otp}`);
                socket.otp = otp;
                socket.emit("otpGenerated", otp);
            })
            .catch((error) => {
                console.error(`Error sending OTP: ${error}`);
                socket.emit("otpSendError");
            });
    });

    socket.on("verifyOTP", (enteredOTP) => {
        const generatedOTP = socket.otp;

        if (enteredOTP == generatedOTP) {
            socket.emit("redirectToVendor");
        } else {
            socket.emit("otpInvalid");
        }
    });
});

http.listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
});
