#!/usr/bin/env node
// Run once to create (or reset the API key of) the Claude agent user in MongoDB.
// Usage: node kose-mcp/create-agent-user.js
const mongoose = require('mongoose')
const crypto = require('crypto')
const dotenv = require('dotenv')
const path = require('path')

dotenv.config({ path: path.join(__dirname, '..', 'config', 'config.env') })

const User = require('../models/User.model')

async function main() {
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })

  const apiKey = crypto.randomBytes(32).toString('hex')
  const existing = await User.findOne({ username: 'agent@kose.local' })

  if (existing) {
    existing.set({ apiKey })
    await existing.save()
    console.log('Updated existing agent user with new API key.')
  } else {
    await User.create({
      username: 'agent@kose.local',
      displayName: 'Claude Agent',
      password: crypto.randomBytes(32).toString('hex'),
      accesses: ['*'],
      apiKey,
    })
    console.log('Created agent user.')
  }

  console.log('\n--- Copy this API key into ~/.claude/settings.json ---')
  console.log(apiKey)
  console.log('------------------------------------------------------\n')
  console.log('Set it as: mcpServers.kose.env.KOSE_API_KEY')

  await mongoose.disconnect()
}

main().catch(err => { console.error(err); process.exit(1) })
