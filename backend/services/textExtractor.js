const { PDFParse } = require('pdf-parse')
const mammoth = require('mammoth')

const TEXT_EXTENSIONS = ['.txt', '.md', '.csv', '.log', '.json']

const getExtension = (filename) => {
    const dot = filename.lastIndexOf('.')
    return dot === -1 ? '' : filename.slice(dot).toLowerCase()
}

// Extract plain text from an uploaded file buffer
const extractText = async (file) => {
    const ext = getExtension(file.originalname)

    if (ext === '.pdf' || file.mimetype === 'application/pdf') {
        const parser = new PDFParse({ data: new Uint8Array(file.buffer) })
        try {
            const { text } = await parser.getText()
            return text
        } finally {
            await parser.destroy()
        }
    }

    if (ext === '.docx') {
        const { value } = await mammoth.extractRawText({ buffer: file.buffer })
        return value
    }

    if (TEXT_EXTENSIONS.includes(ext) || file.mimetype.startsWith('text/')) {
        return file.buffer.toString('utf8')
    }

    const error = new Error(`Unsupported file type: ${ext || file.mimetype}`)
    error.status = 415
    throw error
}

module.exports = { extractText }
