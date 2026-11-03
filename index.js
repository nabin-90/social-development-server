import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";
import { toNodeHandler } from "better-auth/node";
import { createAuth } from "./auth.js";
import { verifyToken } from "./middleware/verifyToken.js";
import validateEvent from "./validators/eventValidator.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://social-development-client.vercel.app",
    ],
    credentials: true,
  })
);

// Skip JSON parsing for Better Auth requests
app.use((req, res, next) => {
  if (req.path.startsWith("/api/auth")) {
    return next();
  }

  express.json()(req, res, next);
});

// Test API
app.get("/", (req, res) => {
  res.send("Social Development Events Server is Running!");
});



// Get all upcoming events
app.get("/events", async (req, res) => {
  try {
    // Get today's date in Bangladesh timezone
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Dhaka",
    }).format(new Date());

    // Get query parameters
    const { type, limit, search } = req.query;

    // Build MongoDB filter
    const filter = {
      eventDate: { $gte: today },
    };

    // Filter by event type
    if (type) {
      filter.type = type;
    }

    // Search by title or location
    if (search && search.trim()) {
      const escapedSearch = search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      filter.$or = [
        { title: { $regex: escapedSearch, $options: "i" } },
        { location: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    // Find upcoming events
    let query = app.locals.db
      .collection("events")
      .find(filter)
      .sort({ eventDate: 1 });

    // Apply limit
    const parsedLimit = Number(limit);

    if (limit && Number.isInteger(parsedLimit) && parsedLimit > 0) {
      query = query.limit(parsedLimit);
    }

    const events = await query.toArray();

    res.status(200).json({
      success: true,
      message: "Upcoming events fetched successfully",
      total: events.length,
      data: events,
    });
  } catch (error) {
    console.error("Failed to fetch events:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch events",
    });
  }
});


// Create an event (JWT protected)
app.post("/events", verifyToken, async (req, res) => {
  try {
    const eventData = req.body;

    const validation = validateEvent(eventData);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Event validation failed",
        errors: validation.errors,
      });
    }

    // Creator identity comes from verified JWT, not request body
    const creatorEmail = req.user.email?.toLowerCase();

    if (!creatorEmail) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user email is missing",
      });
    }

    // Do not allow client to set ownership or MongoDB ID
    delete eventData._id;
    delete eventData.creatorEmail;

    const newEvent = {
      ...eventData,
      creatorEmail,
      createdAt: new Date(),
    };

    const result = await app.locals.db.collection("events").insertOne(newEvent);

    res.status(201).json({
      success: true,
      message: "Event created successfully",
      data: {
        _id: result.insertedId,
        ...newEvent,
      },
    });
  } catch (error) {
    console.error("Failed to create event:", error);

    res.status(500).json({
      success: false,
      message: "Failed to create event",
    });
  }
});

// Get a single event by ID
app.get("/events/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ObjectId
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID",
      });
    }

    // Find event by ID
    const event = await app.locals.db
      .collection("events")
      .findOne({ _id: new ObjectId(id) });

    // Check if event exists
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Event fetched successfully",
      data: event,
    });
  } catch (error) {
    console.error("Failed to fetch event:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch event",
    });
  }
});

// Update an event (JWT protected, creator only)
app.put("/events/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = { ...req.body };
    const creatorEmail = req.user.email?.toLowerCase();

    // Validate event ID
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID",
      });
    }

    if (!creatorEmail) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user email is missing",
      });
    }

    // Prevent changing ownership or MongoDB ID
    delete updatedData._id;
    delete updatedData.creatorEmail;

    const eventsCollection = app.locals.db.collection("events");

    // Find existing event owned by the logged-in user
    const existingEvent = await eventsCollection.findOne({
      _id: new ObjectId(id),
      creatorEmail,
    });

    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        message: "Event not found or you are not authorized to update it",
      });
    }

    // Merge existing event with updated data
    const mergedEvent = {
      ...existingEvent,
      ...updatedData,
    };

    // Validate the complete event
    const validation = validateEvent(mergedEvent);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: "Event validation failed",
        errors: validation.errors,
      });
    }

    // Update event
    const result = await eventsCollection.updateOne(
      {
        _id: new ObjectId(id),
        creatorEmail,
      },
      {
        $set: {
          ...updatedData,
          updatedAt: new Date(),
        },
      },
    );

    res.status(200).json({
      success: true,
      message: "Event updated successfully",
    });
  } catch (error) {
    console.error("Failed to update event:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update event",
    });
  }
});

// Delete an event
app.delete("/events/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const creatorEmail = req.user.email?.toLowerCase();

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID",
      });
    }

    if (!creatorEmail) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user email is missing",
      });
    }

    const result = await app.locals.db.collection("events").deleteOne({
      _id: new ObjectId(id),
      creatorEmail,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Event not found or you are not authorized to delete it",
      });
    }

    // Delete all related joined event records
    const cleanupResult = await app.locals.db
      .collection("joinedEvents")
      .deleteMany({
        eventId: new ObjectId(id),
      });

    console.log(`${cleanupResult.deletedCount} joined event records deleted`);

    res.status(200).json({
      success: true,
      message: "Event deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete event:", error);

    res.status(500).json({
      success: false,
      message: "Failed to delete event",
    });
  }
});

// Join an event (JWT protected)
app.post("/events/:id/join", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get authenticated user's email from JWT
    const userEmail = req.user.email?.toLowerCase();

    // Validate event ID
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID",
      });
    }

    // Validate user email
    if (!userEmail) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user email is missing",
      });
    }

    const db = app.locals.db;
    const eventId = new ObjectId(id);

    // Check if event exists
    const event = await db.collection("events").findOne({
      _id: eventId,
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Check if user already joined
    const existingJoin = await db.collection("joinedEvents").findOne({
      eventId,
      userEmail,
    });

    if (existingJoin) {
      return res.status(409).json({
        success: false,
        message: "You have already joined this event",
      });
    }

    // Save joined event
    const result = await db.collection("joinedEvents").insertOne({
      eventId,
      userEmail,
      joinedAt: new Date(),
    });

    res.status(201).json({
      success: true,
      message: "Event joined successfully",
      data: {
        _id: result.insertedId,
        eventId,
        userEmail,
      },
    });
  } catch (error) {
    // Handle duplicate join error
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "You have already joined this event",
      });
    }

    console.error("Failed to join event:", error);

    res.status(500).json({
      success: false,
      message: "Failed to join event",
    });
  }
});

// Get joined events (JWT protected)
app.get("/joined-events", verifyToken, async (req, res) => {
  try {
    // Get authenticated user's email from JWT
    const email = req.user.email?.toLowerCase();

    if (!email) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user email is missing",
      });
    }

    const joinedEvents = await app.locals.db
      .collection("joinedEvents")
      .aggregate([
        {
          $match: {
            userEmail: email,
          },
        },
        {
          $lookup: {
            from: "events",
            localField: "eventId",
            foreignField: "_id",
            as: "event",
          },
        },
        {
          $unwind: "$event",
        },
        {
          $replaceRoot: {
            newRoot: "$event",
          },
        },
        {
          $sort: {
            eventDate: 1,
          },
        },
      ])
      .toArray();

    res.status(200).json({
      success: true,
      message: "Joined events fetched successfully",
      total: joinedEvents.length,
      data: joinedEvents,
    });
  } catch (error) {
    console.error("Failed to fetch joined events:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch joined events",
    });
  }
});

// Get my events (JWT protected)
app.get("/my-events", verifyToken, async (req, res) => {
  try {
    // Get authenticated user's email from JWT
    const email = req.user.email?.toLowerCase();

    if (!email) {
      return res.status(401).json({
        success: false,
        message: "Authenticated user email is missing",
      });
    }

    const myEvents = await app.locals.db
      .collection("events")
      .find({
        creatorEmail: email,
      })
      .sort({ eventDate: 1 })
      .toArray();

    res.status(200).json({
      success: true,
      message: "My events fetched successfully",
      total: myEvents.length,
      data: myEvents,
    });
  } catch (error) {
    console.error("Failed to fetch my events:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch my events",
    });
  }
});

// Protected test route
app.get("/protected-test", verifyToken, (req, res) => {
  res.status(200).json({
    success: true,
    message: "JWT verified successfully",
    user: req.user,
  });
});

// Start server
const client = new MongoClient(process.env.MONGODB_URI);

let db;
let auth;
let dbReady;

async function connectDB() {
  if (!dbReady) {
    dbReady = (async () => {
      await client.connect();
      await client.db("admin").command({ ping: 1 });

      console.log("MongoDB Connected Successfully!");

      db = client.db(process.env.DB_NAME);

      await db.collection("joinedEvents").createIndex(
        {
          eventId: 1,
          userEmail: 1,
        },
        {
          unique: true,
        },
      );

      console.log("Joined Events Unique Index Created!");

      app.locals.db = db;

      auth = createAuth(db, client);

      app.all("/api/auth/{*any}", toNodeHandler(auth));

      console.log("Better Auth Initialized!");
    })().catch((error) => {
      dbReady = null;
      throw error;
    });
  }

  return dbReady;
}

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("MongoDB Connection Failed:", error);
    res.status(500).json({ message: "Database connection failed" });
  }
});

export default app;
