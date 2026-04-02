var express = require('express')
var router = express.Router()
let mongoose = require('mongoose')
let path = require('path')
let fs = require('fs')
let multer = require('multer')
let messageModel = require('../schemas/messages')
let { checkLogin } = require('../utils/authHandler')

const uploadDir = path.join(__dirname, '../uploads/messages')
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
}

let messageStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir)
    },
    filename: function (req, file, cb) {
        let ext = path.extname(file.originalname)
        let filename = Date.now() + '-' + Math.round(Math.random() * 2E9) + ext
        cb(null, filename)
    }
})

let messageUpload = multer({
    storage: messageStorage,
    limits: {
        fileSize: 10 * 1024 * 1024
    }
})

router.get('/', checkLogin, async function (req, res, next) {
    try {
        let currentUserId = req.user._id.toString()
        let allMessages = await messageModel.find({
            $or: [
                { from: req.user._id },
                { to: req.user._id }
            ]
        }).sort({ createdAt: -1 })
            .populate('from', 'username fullName avatarUrl')
            .populate('to', 'username fullName avatarUrl')

        let lastMessages = []
        let chattedUserIds = new Set()

        allMessages.forEach(function (message) {
            let fromId = message.from && message.from._id ? message.from._id.toString() : message.from.toString()
            let toId = message.to && message.to._id ? message.to._id.toString() : message.to.toString()
            let otherUserId = fromId === currentUserId ? toId : fromId

            if (!chattedUserIds.has(otherUserId)) {
                chattedUserIds.add(otherUserId)
                lastMessages.push(message)
            }
        })

        res.send(lastMessages)
    } catch (error) {
        res.status(400).send({ message: error.message })
    }
})

router.get('/:userID', checkLogin, async function (req, res, next) {
    try {
        let userID = req.params.userID
        if (!mongoose.Types.ObjectId.isValid(userID)) {
            res.status(404).send({ message: 'userID khong hop le' })
            return
        }

        let userModel = require('../schemas/users')
        let currentUser = req.user
        let otherUser = await userModel.findById(userID).select('username fullName avatarUrl')

        if (!otherUser) {
            res.status(404).send({ message: 'userID khong ton tai' })
            return
        }

        let data = await messageModel.find({
            $or: [
                {
                    from: req.user._id,
                    to: userID
                },
                {
                    from: userID,
                    to: req.user._id
                }
            ]
        }).sort({ createdAt: 1 })
            .select('messageContent from to createdAt -_id')

        res.send({
            participants: [
                {
                    _id: currentUser._id,
                    username: currentUser.username,
                    fullName: currentUser.fullName,
                    avatarUrl: currentUser.avatarUrl
                },
                {
                    _id: otherUser._id,
                    username: otherUser.username,
                    fullName: otherUser.fullName,
                    avatarUrl: otherUser.avatarUrl
                }
            ],
            messages: data.map(msg => ({
                messageContent: msg.messageContent,
                from: msg.from,
                to: msg.to,
                createdAt: msg.createdAt
            }))
        })
    } catch (error) {
        res.status(400).send({ message: error.message })
    }
})

router.post('/', checkLogin, messageUpload.single('file'), async function (req, res, next) {
    try {
        let { to, text } = req.body

        if (!to || !mongoose.Types.ObjectId.isValid(to)) {
            res.status(404).send({ message: 'to khong hop le' })
            return
        }

        let type = 'text'
        let contentText = text

        if (req.file) {
            type = 'file'
            contentText = path.join('uploads', 'messages', req.file.filename).replace(/\\/g, '/')
        }

        if (!contentText || !contentText.toString().trim()) {
            res.status(404).send({ message: 'noi dung tin nhan khong duoc de trong' })
            return
        }

        let newMessage = new messageModel({
            from: req.user._id,
            to: to,
            messageContent: {
                type: type,
                text: contentText
            }
        })

        await newMessage.save()
        await newMessage.populate('from', 'username fullName avatarUrl')
        await newMessage.populate('to', 'username fullName avatarUrl')

        res.send(newMessage)
    } catch (error) {
        res.status(400).send({ message: error.message })
    }
})

module.exports = router