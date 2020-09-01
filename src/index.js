const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage,generateLocation }=require('./utils/messages')
const {addUser,getUser,getUsersInRoom,removeUser}= require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socketio(server);

const port = process.env.PORT || 3000
const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath))

let count = 0
io.on('connection',(socket) => {
    console.log('New webSocket connection')
    
    socket.on('join',(options,callback)=>{
        const {error, user} = addUser({id: socket.id,
            ...options
        })
        if(error) {
            return callback(error)
        }
        socket.join(user.room)
        socket.emit('message',generateMessage('Welcome!'))
        socket.broadcast.to(user.room).emit('message',generateMessage(`${user.username} has joined!`))
        io.to(user.room).emit('roomData',{
            room: user.room,
            users: getUsersInRoom(user.room)
        })
        callback()
    })

    socket.on('sendMessage',(message,callback) => {
        const filter = new Filter()
        const user = getUser(socket.id)

        if(filter.isProfane(message)) {
            return callback('Profanity is not allowed')
        }
        if(user){
        io.to(user.room).emit('message',generateMessage(message))
        callback()
        return ;
        }
        callback('error sd')
    })

    socket.on('disconnect', () => {
        const user=removeUser(socket.id)
        if(user) {
            io.to(user.room).emit('message',generateMessage(`${user.username} has left!`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })

    socket.on('sendLocation', (coords,callback) => {
        console.log('location')
        const user=getUser(socket.id)
        if(user){
        socket.broadcast.to(user.room).emit('location', generateLocation(`https://google.com/maps?q=${coords.latitude},${coords.longitude}`))
        callback()}
    })

    
    // socket.emit('message','Welcome!')
    // socket.on('increment',() => {
    //     count++
    //     // socket.emit('count', count)
    //     io.emit('count',count)
    // })
})

server.listen(port, () => {
    console.log(`Server is up on port ${port}`)
})