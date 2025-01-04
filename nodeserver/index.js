//Connections 
const io = require('socket.io')(8000, {
    cors: {
        origin: "*", // Allow all origins for simplicity (you can restrict this in production)
        methods: ["GET", "POST"] // Allow these HTTP methods
    }
})
const users = {}

io.on('connection',socket=>{
    socket.on('new-user-joined',name =>{
        console.log('New User',name);
        users[socket.id]=name;
        socket.broadcast.emit('user-joined',name) //Send message to all other users except the joined user
    })
    socket.on('send',message=>{
            socket.broadcast.emit('receive',{message:message,name: users[socket.id]})
    })
    socket.on('disconnect', message=>{
        socket.broadcast.emit('left', users[socket.id])
        delete users[socket.id]
})
})
