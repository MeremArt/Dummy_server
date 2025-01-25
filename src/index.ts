import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_IDS = [
  process.env.TELEGRAM_CHAT_ID_1,
  process.env.TELEGRAM_CHAT_ID_2,
  // Add more chat IDs
];

let userChatIds = new Set<string>();
// Mock data
let notifications = [
  {
    id: "1",
    title: "Test Alert",
    description: "System notification",
    timestamp: new Date().toISOString(),
  },
];

// Routes
app.get("/api/notifications", (req, res) => {
  res.json(notifications);
});
app.post("/api/telegram/register", (req, res) => {
  const { chat_id } = req.body;
  userChatIds.add(chat_id);
  res.json({ success: true });
});
app.post("/api/notifications", (req, res) => {
  const notification = {
    id: Date.now().toString(),
    title: req.body.title,
    description: req.body.description,
    timestamp: new Date().toISOString(),
  };

  app.post("/api/send", async (req, res) => {
    const { message } = req.body;
    try {
      const notification = {
        id: Date.now().toString(),
        title: "Suck it",
        description: message,
        timestamp: new Date().toISOString(),
      };

      notifications.unshift(notification);
      res.status(201).json(notification);
    } catch (error) {
      res.status(500).json({ error: "Failed to send message" });
    }
  });
  notifications.unshift(notification);
  res.status(201).json(notification);
});

app.post("/api/track-users", async (req, res) => {
  try {
    const updates = await axios.get(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates`
    );

    updates.data.result.forEach(
      (update: { message: { chat: { id: string } } }) => {
        if (update.message?.chat.id) {
          userChatIds.add(update.message.chat.id);
        }
      }
    );

    // Broadcast to all tracked users
    await Promise.all(
      [...userChatIds].map((chatId) =>
        axios.post(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
          {
            chat_id: chatId,
            text: "Broadcast message to all users",
          }
        )
      )
    );

    res.json({ success: true, users: userChatIds.size });
  } catch (error) {
    res.status(500).json({ error: "Failed to broadcast" });
  }
});

setInterval(async () => {
  try {
    // Log current users
    console.log("Current users:", [...userChatIds]);

    if (userChatIds.size === 0) {
      console.log("No users registered yet");
      return;
    }

    // Send to registered users
    await Promise.all(
      [...userChatIds].map((chatId) =>
        axios.post(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
          {
            chat_id: chatId,
            text: "Automated broadcast message",
          }
        )
      )
    );
    console.log(`Message sent to ${userChatIds.size} users`);
  } catch (error) {
    console.error("Broadcast failed:", error);
  }
}, 30000);
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
