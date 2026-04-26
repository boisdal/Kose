const mongoose = require('mongoose')

const DocumentSchema = new mongoose.Schema({
  project_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  slug: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  body: {
    type: String,
    default: '',
  },
  version: {
    type: Number,
    default: 1,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    default: null,
  },
})

DocumentSchema.index({ project_id: 1, slug: 1 }, { unique: true })

module.exports = mongoose.model('Document', DocumentSchema)
