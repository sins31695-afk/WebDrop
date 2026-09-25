const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

app.use(
    express.static(
        path.join(__dirname, "public")
    )
);


io.on("connection", socket => {

    console.log(
        "Connected:",
        socket.id
    );


    /* =========================
       CREATE ROOM
    ========================= */

    socket.on(
        "create-room",
        roomCode => {

            const existingRoom =
                io.sockets.adapter.rooms.get(
                    roomCode
                );

            if (existingRoom) {

                socket.emit(
                    "room-error",
                    "Room code already exists."
                );

                return;
            }


            socket.join(roomCode);

            socket.roomCode =
                roomCode;


            socket.emit(
                "room-created",
                roomCode
            );


            console.log(
                "Room created:",
                roomCode
            );

        }
    );


    /* =========================
       JOIN ROOM
    ========================= */

    socket.on(
        "join-room",
        roomCode => {

            const room =
                io.sockets.adapter.rooms.get(
                    roomCode
                );


            if (!room) {

                socket.emit(
                    "room-error",
                    "Room not found."
                );

                return;
            }


            if (room.size >= 2) {

                socket.emit(
                    "room-error",
                    "Room is full."
                );

                return;
            }


            socket.join(roomCode);

            socket.roomCode =
                roomCode;


            socket.emit(
                "room-joined"
            );


            socket.to(
                roomCode
            ).emit(
                "device-connected"
            );


            console.log(
                "Device joined:",
                roomCode
            );

        }
    );


    /* =========================
       WEBRTC OFFER
    ========================= */

    socket.on(
        "offer",
        data => {

            if (!data || !data.roomCode) {
                return;
            }

            socket.to(
                data.roomCode
            ).emit(
                "offer",
                data.offer
            );

        }
    );


    /* =========================
       WEBRTC ANSWER
    ========================= */

    socket.on(
        "answer",
        data => {

            if (!data || !data.roomCode) {
                return;
            }

            socket.to(
                data.roomCode
            ).emit(
                "answer",
                data.answer
            );

        }
    );


    /* =========================
       ICE
    ========================= */

    socket.on(
        "ice-candidate",
        data => {

            if (
                !data ||
                !data.roomCode ||
                !data.candidate
            ) {
                return;
            }

            socket.to(
                data.roomCode
            ).emit(
                "ice-candidate",
                data.candidate
            );

        }
    );


    /* =========================
       DISCONNECT
    ========================= */

    socket.on(
        "disconnect",
        () => {

            if (socket.roomCode) {

                socket.to(
                    socket.roomCode
                ).emit(
                    "device-disconnected"
                );

            }

            console.log(
                "Disconnected:",
                socket.id
            );

        }
    );

});


const PORT =
    process.env.PORT || 3000;


server.listen(
    PORT,
    () => {

        console.log(
            `WebDrop running on port ${PORT}`
        );

    }
);