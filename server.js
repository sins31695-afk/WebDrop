const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

const rooms = new Map();

io.on("connection", (socket) => {
    console.log("Device connected:", socket.id);

    socket.on("create-room", (roomCode) => {

        if (rooms.has(roomCode)) {
            socket.emit("room-error", "Room already exists.");
            return;
        }

        rooms.set(roomCode, {
            host: socket.id,
            guest: null
        });

        socket.join(roomCode);
        socket.roomCode = roomCode;

        socket.emit("room-created", roomCode);

        console.log("Room created:", roomCode);
    });


    socket.on("join-room", (roomCode) => {

        const room = rooms.get(roomCode);

        if (!room) {
            socket.emit(
                "room-error",
                "Room not found. Check the code."
            );
            return;
        }

        if (room.guest) {
            socket.emit(
                "room-error",
                "Room is already full."
            );
            return;
        }

        room.guest = socket.id;

        socket.join(roomCode);
        socket.roomCode = roomCode;

        socket.emit("room-joined");

        io.to(room.host).emit("device-connected");
        io.to(room.guest).emit("device-connected");

        console.log(
            "Device joined room:",
            roomCode
        );
    });


    /*
        WebRTC signaling only.

        Actual file data does NOT pass
        through the server.
    */

    socket.on("offer", ({ roomCode, offer }) => {

        if (!rooms.has(roomCode)) {
            return;
        }

        socket.to(roomCode).emit(
            "offer",
            offer
        );
    });


    socket.on("answer", ({ roomCode, answer }) => {

        if (!rooms.has(roomCode)) {
            return;
        }

        socket.to(roomCode).emit(
            "answer",
            answer
        );
    });


    socket.on(
        "ice-candidate",
        ({ roomCode, candidate }) => {

            if (!rooms.has(roomCode)) {
                return;
            }

            socket
                .to(roomCode)
                .emit(
                    "ice-candidate",
                    candidate
                );
        }
    );


    socket.on("disconnect", () => {

        const roomCode = socket.roomCode;

        if (!roomCode) {
            return;
        }

        const room = rooms.get(roomCode);

        if (!room) {
            return;
        }

        socket
            .to(roomCode)
            .emit(
                "device-disconnected"
            );

        rooms.delete(roomCode);

        console.log(
            "Room closed:",
            roomCode
        );
    });

});


server.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `WebDrop running on port ${PORT}`
        );

    }
);