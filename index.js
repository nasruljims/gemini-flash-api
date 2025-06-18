const express = require('express')
const dotenv = require('dotenv')
const multer = require('multer')
const fs = require('fs')
const path = require('path')
const { GoogleGenerativeAI } = require('@google/generative-ai')

dotenv.config()
const app = express()
const port = 3000

app.use(express.json())

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const model = genAI.getGenerativeModel({model: 'models/gemini-1.5-flash'})

const upload = multer({dest: 'uploads/'})

app.listen(port, () => {
  console.log(`Gemini API server is running at http://localhost:${port}`)
})

app.get('/', (req, res) => {
  res.send('Hello World!')
})


app.post('/generate-text', async (req, res) => {
    console.log('Received request to generate text')
    const { prompt } = req.body
    try {
        const result = await model.generateContent(prompt)
        const response = result.response
        res.json({output: response.text()})
    } catch (error) {
        res.status(500).json({ error: error.message })
    }
})

// Helper function to convert image file to a generative part
function imageToGenerativePart(filePath) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(filePath)).toString("base64"),
      mimeType: 'image/png/jpeg' // Consider making this dynamic based on file type
    },
  };
}

app.post('/generate-from-image', upload.single('image'), async (req, res) => {
    const prompt = req.body.prompt || 'Describe the image'
    const image = imageToGenerativePart(req.file.path)
    try {
        const result = await model.generateContent([prompt, image])
        const response = result.response
        res.json({output: response.text()})
    } catch (error) {
        res.status(500).json({ error: error.message })
    } finally {
        fs.unlinkSync(req.file.path) // Clean up the uploaded file
    }
})

app.post('/generate-from-document', upload.single('document'), async (req, res) => {
    const documentPath = req.file.path
    const documentData = fs.readFileSync(documentPath)
    const documentPart = {
        inlineData: {
            data: Buffer.from(documentData).toString("base64"),
            mimeType: req.file.mimetype
        },
    }
    try {
        const result = await model.generateContent(['Analyze this document', documentPart])
        const response = result.response
        res.json({output: response.text()})
    } catch (error) {
        res.status(500).json({ error: error.message })
    } finally {
        fs.unlinkSync(documentPath) // Clean up the uploaded file
    }
})

app.post('/generate-from-audio', upload.single('audio'), async (req, res) => {
    const audioPath = req.file.path
    const audioData = fs.readFileSync(audioPath)
    const audioPart = {
        inlineData: {
            data: Buffer.from(audioData).toString("base64"),
            mimeType: req.file.mimetype
        },
    }
    try {
        const result = await model.generateContent(['Transcribe this audio', audioPart])
        const response = result.response
        res.json({output: response.text()})
    } catch (error) {
        res.status(500).json({ error: error.message })
    } finally {
        fs.unlinkSync(audioPath) // Clean up the uploaded file
    }
})