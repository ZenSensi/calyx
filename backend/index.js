require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { AccessToken, RoomServiceClient } = require('livekit-server-sdk');

const app = express();
const port = process.env.PORT || 3000;

const svc = new RoomServiceClient(
  process.env.LIVEKIT_URL || 'https://calyx-meet-dps7lskv.livekit.cloud',
  process.env.LIVEKIT_API_KEY,
  process.env.LIVEKIT_API_SECRET
);

app.use(cors());
app.use(express.json());

app.post('/api/getToken', async (req, res) => {
  const { roomName, participantName, isHost, isWaiting, photoURL } = req.body;

  if (!roomName || !participantName) {
    return res.status(400).json({ error: 'roomName and participantName are required' });
  }

  try {
    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      {
        identity: participantName,
        name: participantName,
        metadata: JSON.stringify({ isHost: !!isHost, isWaiting: !!isWaiting, photoURL }),
      }
    );

    console.log(`Generating token for ${participantName} in room ${roomName}. Host: ${isHost}, Waiting: ${isWaiting}`);
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: !isWaiting,
      canPublishData: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();
    res.json({ token });
  } catch (error) {
    console.error('Error generating token:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});

// Admit participant: Update metadata to isWaiting: false and grant publish permissions
app.post('/api/admitParticipant', async (req, res) => {
  const { roomName, identity } = req.body;
  try {
    // 1. Update metadata
    await svc.updateParticipant(roomName, identity, JSON.stringify({ isWaiting: false, isHost: false }));

    // 2. Update permissions to allow publishing
    await svc.updateSubscriptions(roomName, identity, [], true);
    // Wait, updateSubscriptions is for subscribing. To update publishing permissions, we use updateParticipant permissions.
    await svc.updateParticipant(roomName, identity, undefined, {
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    });

    console.log(`Admitted participant ${identity} in room ${roomName}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error admitting participant:', error);
    res.status(500).json({ error: 'Failed to admit participant' });
  }
});

// Deny participant: Remove them from the room
app.post('/api/denyParticipant', async (req, res) => {
  const { roomName, identity } = req.body;
  try {
    await svc.removeParticipant(roomName, identity);
    console.log(`Denied participant ${identity} in room ${roomName}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error denying participant:', error);
    res.status(500).json({ error: 'Failed to deny participant' });
  }
});

// Health Check endpoint for Render deployment
app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});
