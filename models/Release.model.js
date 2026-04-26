const mongoose = require('mongoose')

const ReleaseSchema = new mongoose.Schema({
  version_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Version',
    required: true,
  },
  notes: {
    type: String,
    default: '',
  },
  published_at: {
    type: Date,
    default: Date.now,
  },
  tag: {
    type: String,
    required: false,
    default: null,
  },
  commits: {
    type: [String],
    default: [],
  },
})

module.exports = mongoose.model('Release', ReleaseSchema)
