const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { ObjectId } = require('mongodb');
const redisClient = require('../utils/redis');
const dbClient = require('../utils/db');

class FilesController {
    static async postUpload(req, res) {
        console.log(req.body, '++++++++++++++++++++');
        const token = req.headers['x-token'];
        if (!token) return res.status(401).send({ error: 'Unauthorized' });

        const userId = await redisClient.get(`auth_${token}`);
        if (!userId) return res.status(401).send({ error: 'Unauthorized' });

        const user = await dbClient.collection('users').findOne({ _id: new ObjectId(userId) });
        if (!user) return res.status(401).send({ error: 'Unauthorized' });

        const { name, type, parentId = 0, isPublic = false, data } = req.body;

        if (!name) return res.status(400).send({ error: 'Missing name' });
        if (!type || !['folder', 'file', 'image'].includes(type)) {
            return res.status(400).send({ error: 'Missing type' });
        }
        if (!data && type !== 'folder') return res.status(400).send({ error: 'Missing data' });

        if (parentId !== 0) {
            const parent = await dbClient.collection('files').findOne({ _id: new ObjectId(parentId) });
            if (!parent) return res.status(400).send({ error: 'Parent not found' });
            if (parent.type !== 'folder') {
                return res.status(400).send({ error: 'Parent is not a folder' });
            }
        }

        const fileDoc = {
            userId: userId.toString(),
            name,
            type,
            isPublic,
            parentId: parentId === 0 ? 0 : new ObjectId(parentId),
            createdAt: new Date(),
        };

        if (type === 'folder') {
            const result = await dbClient.collection('files').insertOne(fileDoc);
            return res.status(201).send({
                id: result.insertedId,
                userId: fileDoc.userId,
                name,
                type,
                isPublic,
                parentId,
            });
        } else {
            // Determine folder path
            const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
            if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });

            // Generate unique file path
            const fileId = uuidv4();
            const localPath = path.join(folderPath, fileId);

            // Decode Base64 data and write to file
            fs.writeFileSync(localPath, Buffer.from(data, 'base64'));

            fileDoc.localPath = localPath;
            const result = await dbClient.collection('files').insertOne(fileDoc);

            return res.status(201).send({
                id: result.insertedId,
                userId: fileDoc.userId,
                name,
                type,
                isPublic,
                parentId,
            });
        }
    }

    static async getShow(req, res) {
        const token = req.headers['x-token'];
        if (!token) return res.status(401).send({ error: 'Unauthorized' });

        const userId = await redisClient.get(`auth_${token}`);
        if (!userId) return res.status(401).send({ error: 'Unauthorized' });

        const user = await dbClient.collection('users').findOne({ _id: new ObjectId(userId) });
        if (!user) return res.status(401).send({ error: 'Unauthorized' });

        const fileId = req.params.id;
        if (!fileId) return res.status(404).send({ error: 'Not found' });

        const file = await dbClient.collection('files').findOne({ _id: new ObjectId(fileId) });
        if (!file) return res.status(404).send({ error: 'Not found' });

        if (file.userId !== userId.toString() && !file.isPublic) {
            return res.status(403).send({ error: 'Forbidden' });
        }

        return res.status(200).send({
            id: file._id,
            userId: file.userId,
            name: file.name,
            type: file.type,
            isPublic: file.isPublic,
            parentId: file.parentId,
        });
    }

    static async getIndex(req, res) {
        const token = req.headers['x-token'];
        if (!token) return res.status(401).send({ error: 'Unauthorized' });

        const userId = await redisClient.get(`auth_${token}`);
        if (!userId) return res.status(401).send({ error: 'Unauthorized' });

        const user = await dbClient.collection('users').findOne({ _id: new ObjectId(userId) });
        if (!user) return res.status(401).send({ error: 'Unauthorized' });

        const parentId = req.query.parentId || 0;
        if (parentId !== 0) {
            const parent = await dbClient.collection('files').findOne({ _id: new ObjectId(parentId) });
            if (!parent) return res.status(200).send([]);
            if (parent.type !== 'folder') return res.status(200).send([]);
        }

        const query = { parentId: parentId === 0 ? 0 : new ObjectId(parentId) };
        if (parentId === 0) query.userId = userId.toString();
        const files = await dbClient.collection('files').find(query).toArray();

        return res.status(200).send(files.map((file) => ({
            id: file._id,
            userId: file.userId,
            name: file.name,
            type: file.type,
            isPublic: file.isPublic,
            parentId: file.parentId,
        })));
    }
}

module.exports = FilesController;
