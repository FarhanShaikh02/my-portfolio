const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_FILE = path.join(__dirname, "data.json");
const UPLOAD_DIR = path.join(__dirname, "uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR);
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
});

app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(UPLOAD_DIR));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        cb(null, "profile" + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

function readData() {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Legacy API — kept for existing frontend compatibility
app.get("/api/data", (req, res) => {
    try {
        const data = readData();

        res.json({
            name: data.home?.name || "",
            about: data.home?.about || data.about?.description || "",
            instagram: data.social?.instagram || "",
            youtube: data.social?.youtube || "",
            photo: data.home?.photo || ""
        });
    } catch (error) {
        res.status(500).json({ error: "Could not read data" });
    }
});

app.post("/api/data", (req, res) => {
    try {
        const data = readData();

        data.home = data.home || {};
        data.about = data.about || {};
        data.social = data.social || {};

        data.home.name = req.body.name || "";
        data.home.about = req.body.about || "";
        data.about.description = req.body.about || "";

        data.social.instagram = req.body.instagram || "";
        data.social.youtube = req.body.youtube || "";

        saveData(data);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Could not save data" });
    }
});

// Profile photo upload
app.post("/api/photo", upload.single("photo"), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No photo" });
        }

        const data = readData();

        data.home = data.home || {};
        data.home.photo = "/uploads/" + req.file.filename;

        saveData(data);

        res.json({
            success: true,
            photo: data.home.photo
        });
    } catch (error) {
        res.status(500).json({ error: "Photo upload failed" });
    }
});


// Gallery media upload
const galleryStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const base = path.basename(file.originalname, ext)
            .replace(/[^a-zA-Z0-9_-]/g, "-")
            .slice(0, 40);

        cb(null, "gallery-" + Date.now() + "-" + base + ext);
    }
});

const galleryUpload = multer({
    storage: galleryStorage,
    limits: {
        fileSize: 100 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        if (
            file.mimetype.startsWith("image/") ||
            file.mimetype.startsWith("video/")
        ) {
            cb(null, true);
        } else {
            cb(new Error("Only image and video files are allowed"));
        }
    }
});

app.post("/api/gallery-upload", galleryUpload.single("media"), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No image or video selected" });
        }

        const mediaUrl = "/uploads/" + req.file.filename;

        res.json({
            success: true,
            url: mediaUrl,
            type: req.file.mimetype.startsWith("video/")
                ? "video"
                : "image"
        });
    } catch (error) {
        res.status(500).json({
            error: "Gallery upload failed"
        });
    }
});

// Full Admin API
app.get("/api/full-data", (req, res) => {
    try {
        res.json(readData());
    } catch (error) {
        res.status(500).json({ error: "Read failed" });
    }
});

app.post("/api/full-data", (req, res) => {
    try {
        const current = readData();
        const incoming = req.body;

        // Preserve the complete structure even if Admin sends partial data
        const data = {
            ...current,
            ...incoming,

            home: {
                ...(current.home || {}),
                ...(incoming.home || {})
            },

            about: {
                ...(current.about || {}),
                ...(incoming.about || {})
            },

            social: {
                ...(current.social || {}),
                ...(incoming.social || {})
            },

            contact: {
                ...(current.contact || {}),
                ...(incoming.contact || {})
            },

            settings: {
                ...(current.settings || {}),
                ...(incoming.settings || {})
            },

            skills: Array.isArray(incoming.skills)
                ? incoming.skills
                : (current.skills || []),

            projects: Array.isArray(incoming.projects)
                ? incoming.projects
                : (current.projects || []),

            gallery: Array.isArray(incoming.gallery)
                ? incoming.gallery
                : (current.gallery || [])
        };

        saveData(data);

        res.json({
            success: true,
            data
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Save failed" });
    }
});

app.get("/admin", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "admin.html"));
});

app.listen(PORT, () => {
    console.log("Website running at http://localhost:" + PORT);
});
