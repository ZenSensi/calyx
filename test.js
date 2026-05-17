fetch('http://localhost:3000/api/getToken', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ roomName: 'test', participantName: 'test' })
})
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
