const mongoose = require('mongoose')

const ProjectSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  working_dir: {
    type: String,
    required: false,
    default: null,
  },
  discord_category_id: {
    type: String,
    required: false,
    default: null,
  },
  agent_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false,
    default: null,
  },
  default_branch: {
    type: String,
    default: 'main',
  },
  test_command: {
    type: String,
    required: false,
    default: null,
  },
})

module.exports = mongoose.model('Project', ProjectSchema)
