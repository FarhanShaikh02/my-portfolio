const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

const DATA_FILE = path.join(__dirname, "data.json");
const UPLOAD_DIR = path.join(__dirname, "uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR);
}

if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({
        name: "Farhan Shaikh",
        about: "I'm a curious and creative person who enjoys technology, coding, digital content and discovering new things.",
        instagram: "https://www.instagram.com/farhan_shaikh02_/",
        youtube: "https://youtube.com/@farhan_shaikh02-t9c",
        photo: ""
    }, null, 2));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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

app.get("/api/data", (req, res) => {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    res.json(data);
});

app.post("/api/data", (req, res) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
});

app.post("/api/photo", upload.single("photo"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No photo selected" });
    }

    const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    data.photo = "/uploads/" + req.file.filename;

    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

    res.json({
        success: true,
        photo: data.photo
    });
});

app.listen(PORT, () => {
    console.log(`Website running at http://localhost:${PORT}`);
});
