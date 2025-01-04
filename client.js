const socket = io('http://localhost:8000');
const form = document.getElementById('send-container')
const messageinput = document.getElementById('messageinp')
const container = document.querySelector('.bg')
var audio = new Audio('./notification.mp3');
const append = (message,position)=>{
    const messageElement = document.createElement('div')
    messageElement.innerText = message;
    messageElement.classList.add('message');
    messageElement.classList.add(position);
    if (position == 'center'){
        messageElement.classList.add('joined')
    }
    if(position == "up"){
        messageElement.classList.add('leavee')
    }
    if(position =="left"){
        audio.play();
    }
    container.append(messageElement)
}

const namea = prompt('Enter your name to join');
socket.emit('new-user-joined', namea);

socket.on('user-joined',name=>{
    append(`${name} joined the chat`, 'center')
})

socket.on('receive',data=>{
    append(`${data.name} : ${data.message}`,'left')
})

socket.on('left',name=>{
    append(`${name} left the chat`, 'up')
})
form.addEventListener('submit',(e)=>{
    e.preventDefault();
    const userMessage = messageinput.value;
    append(`You: ${userMessage}`, 'right')
    socket.emit('send',userMessage);
    messageinput.value = '';
})