const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Serve static files
app.use(express.static('public'));

// Store users and their rooms
const users = {};

io.on('connection', socket => {
    console.log('New WebSocket connection');

    socket.on('join', ({ username, room }) => {
        // Leave current room if user is already in one
        if (users[socket.id]) {
            socket.leave(users[socket.id].room);
        }

        // Join new room
        socket.join(room);
        users[socket.id] = { username, room };

        // Emit welcome message
        socket.emit('message', { 
            user: 'Admin', 
            text: `${username}, welcome to room ${room}` 
        });

        // Broadcast to room that new user joined
        socket.broadcast.to(room).emit('message', {
            user: 'Admin',
            text: `${username} has joined!`
        });
    });

    socket.on('sendMessage', message => {
        const user = users[socket.id];
        io.to(user.room).emit('message', { user: user.username, text: message });
    });

    socket.on('changeRoom', newRoom => {
        const user = users[socket.id];
        if (user) {
            socket.leave(user.room);
            socket.join(newRoom);
            user.room = newRoom;
            socket.emit('message', { user: 'Admin', text: `You have joined room ${newRoom}` });
        }
    });
    socket.on('disconnect', () => {
        if (users[socket.id]) {
            const { username, room } = users[socket.id];
            delete users[socket.id];
            io.to(room).emit('message', { user: 'Admin', text: `${username} has left.` });
        }
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
