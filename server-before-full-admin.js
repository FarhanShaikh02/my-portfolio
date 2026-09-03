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

function readData() {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function saveData(data) {
    fs.writeFileSync(
        DATA_FILE,
        JSON.stringify(data, null, 2)
    );
}

app.get("/api/data", (req, res) => {
    try {
        const data = readData();

        res.json({
            name: data.profile?.name || "",
            about: data.profile?.about || "",
            instagram: data.socials?.instagram || "",
            youtube: data.socials?.youtube || "",
            photo: data.profile?.photo || ""
        });

    } catch (error) {
        res.status(500).json({
            error: "Could not read data"
        });
    }
});

app.post("/api/data", (req, res) => {
    try {
        const oldData = readData();

        oldData.profile = oldData.profile || {};
        oldData.socials = oldData.socials || {};

        oldData.profile.name =
            req.body.name || "";

        oldData.profile.about =
            req.body.about || "";

        oldData.socials.instagram =
            req.body.instagram || "";

        oldData.socials.youtube =
            req.body.youtube || "";

        saveData(oldData);

        res.json({
            success: true
        });

    } catch (error) {
        res.status(500).json({
            error: "Could not save data"
        });
    }
});

app.post("/api/photo", upload.single("photo"), (req, res) => {
    try {

        if (!req.file) {
            return res.status(400).json({
                error: "No photo"
            });
        }

        const data = readData();

        data.profile = data.profile || {};

        data.profile.photo =
            "/uploads/" + req.file.filename;

        saveData(data);

        res.json({
            success: true,
            photo: data.profile.photo
        });

    } catch (error) {
        res.status(500).json({
            error: "Photo upload failed"
        });
    }
});

app.get("/admin", (req, res) => {
    res.sendFile(
        path.join(__dirname, "public", "admin.html")
    );
});

app.listen(PORT, () => {
    console.log(
        "Website running at http://localhost:" + PORT
    );
});