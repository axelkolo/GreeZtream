
const { ObjectID } = require("mongodb");

const crypto = require("crypto");
const streamifier = require("streamifier");
const path = require("path");

const { videoBucket } = require("../database/bucket");
const { createHeaderStreamVideo } = require("../utils/index");

// Handle upload video on POST
exports.video_upload_post = async (req, res) => {
    const { originalname, buffer } = req.file;
    try {
        const filename =
            crypto.randomBytes(16).toString("hex") + path.extname(originalname);
        const uploadStream = videoBucket.openUploadStream(filename);
        const readStream = streamifier.createReadStream(buffer);
        const result = readStream.pipe(uploadStream)
        
        return res.status(200).json({ fileName: result.filename });
    } catch (err) {
        return res.status(400).json({ message: err.message });
    }
};

//Display video on GET 
exports.video_download_get = async (req, res) => {
    const { filename } = req.params;
    const range = req.headers.range;
    //Ensure there is a range given for the video

    if (!range) {
        res.status(400).send("Requires Range header");
    }
    const files = await videoBucket.find({ filename: filename }).toArray();
    if (files.lentgh === 0) {
        return res.status(404).send("File not found");
    }
    const fileSize = files[0].lentgh;

    const {start, end, contentLength} = await createHeaderStreamVideo(range, fileSize)

    const headers = {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": contentLength,
        "Content-Type": "video/mp4",
    };


//HTTP Status 206 for Partial Content
res.writeHead(206, headers);

try {
    const downloadStream = videoBucket.openDownloadStreamByName(filename, {
        start,
        end,
    });

    // Stream the video chunk to the client
    downloadStream.pipe(res);
    } catch (err) {
        return res.status(400).json({ message: err.message });
    }
};

exports.video_delete_delete = async (req, res) => {
    const videoId = req.params.id;

    try {
        await videoBucket.delete(new ObjectID(videoId));
        res.send('video deleted successfully');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};