#!/usr/bin/env node
const { Server } = require('@modelcontextprotocol/sdk/server/index.js')
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js')
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js')
const http = require('http')
const https = require('https')

const KOSE_API_URL = process.env.KOSE_API_URL || 'http://localhost:3000'
const KOSE_API_KEY = process.env.KOSE_API_KEY || ''

async function apiCall(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL('/api' + path, KOSE_API_URL)
    const isHttps = url.protocol === 'https:'
    const bodyStr = body ? JSON.stringify(body) : null
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers: {
        'Authorization': `Bearer ${KOSE_API_KEY}`,
        'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    }
    const req = (isHttps ? https : http).request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }) }
        catch { resolve({ status: res.statusCode, body: data }) }
      })
    })
    req.on('error', reject)
    if (bodyStr) req.write(bodyStr)
    req.end()
  })
}

const TOOLS = [
  {
    name: 'kose_list_projects',
    description: 'List all Kose projects accessible to the agent.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'kose_get_project',
    description: 'Get details of a specific Kose project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: { type: 'string', description: 'Unique project key, e.g. "PROJ"' },
      },
      required: ['projectKey'],
    },
  },
  {
    name: 'kose_list_issues',
    description: 'List issues for a project. Optionally filter by status, versionNumber, or parentIssueKey. Pass parentIssueKey="null" to get only root issues.',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: { type: 'string' },
        status: { type: 'string', enum: ['todo', 'doing', 'done'] },
        versionNumber: { type: 'string' },
        parentIssueKey: { type: 'string', description: 'Issue key of parent, or "null" for root issues' },
      },
      required: ['projectKey'],
    },
  },
  {
    name: 'kose_get_issue',
    description: 'Get a specific issue with its full children tree and aggregated story points.',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: { type: 'string' },
        issueKey: { type: 'number' },
      },
      required: ['projectKey', 'issueKey'],
    },
  },
  {
    name: 'kose_create_issue',
    description: 'Create a new issue in a project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: { type: 'string' },
        title: { type: 'string' },
        issueType: { type: 'string', description: 'e.g. story, task, bug', default: 'task' },
        status: { type: 'string', enum: ['todo', 'doing', 'done'], default: 'todo' },
        estimation: { type: 'number', description: 'Story points' },
        versionNumber: { type: 'string', description: 'Target version number' },
        parentIssueKey: { type: 'number', description: 'Key of parent issue (omit for root)' },
        description: { type: 'string' },
      },
      required: ['projectKey', 'title'],
    },
  },
  {
    name: 'kose_update_issue',
    description: 'Update one or more fields of an existing issue.',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: { type: 'string' },
        issueKey: { type: 'number' },
        title: { type: 'string' },
        issueType: { type: 'string' },
        status: { type: 'string', enum: ['todo', 'doing', 'done'] },
        estimation: { type: 'number' },
        versionNumber: { type: 'string', description: 'Pass "none" to unassign version' },
        description: { type: 'string' },
      },
      required: ['projectKey', 'issueKey'],
    },
  },
  {
    name: 'kose_delete_issue',
    description: 'Delete an issue. Its children are re-parented to the deleted issue\'s parent.',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: { type: 'string' },
        issueKey: { type: 'number' },
      },
      required: ['projectKey', 'issueKey'],
    },
  },
  {
    name: 'kose_move_issue',
    description: 'Change the parent of an issue. Pass parentIssueKey=null to promote it to a root issue.',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: { type: 'string' },
        issueKey: { type: 'number' },
        parentIssueKey: { type: ['number', 'null'], description: 'New parent key, or null for root' },
      },
      required: ['projectKey', 'issueKey', 'parentIssueKey'],
    },
  },
  {
    name: 'kose_list_versions',
    description: 'List all versions/sprints for a project with aggregated story points.',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: { type: 'string' },
      },
      required: ['projectKey'],
    },
  },
  {
    name: 'kose_get_version',
    description: 'Get a specific version with its full issue list and story point totals.',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: { type: 'string' },
        versionNumber: { type: 'string' },
      },
      required: ['projectKey', 'versionNumber'],
    },
  },
  {
    name: 'kose_create_version',
    description: 'Create a new version/sprint in a project.',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: { type: 'string' },
        versionNumber: { type: 'string', description: 'e.g. "1.0", "2.1"' },
        title: { type: 'string' },
        description: { type: 'string' },
      },
      required: ['projectKey', 'versionNumber', 'title'],
    },
  },
  {
    name: 'kose_update_version',
    description: 'Update a version/sprint title, description, or version number.',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: { type: 'string' },
        versionNumber: { type: 'string' },
        newVersionNumber: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string' },
      },
      required: ['projectKey', 'versionNumber'],
    },
  },
  {
    name: 'kose_delete_version',
    description: 'Delete a version/sprint.',
    inputSchema: {
      type: 'object',
      properties: {
        projectKey: { type: 'string' },
        versionNumber: { type: 'string' },
      },
      required: ['projectKey', 'versionNumber'],
    },
  },
]

async function handleTool(name, args) {
  switch (name) {
    case 'kose_list_projects':
      return (await apiCall('GET', '/projects')).body

    case 'kose_get_project':
      return (await apiCall('GET', `/projects/${args.projectKey}`)).body

    case 'kose_list_issues': {
      const params = new URLSearchParams()
      if (args.status) params.set('status', args.status)
      if (args.versionNumber) params.set('versionNumber', args.versionNumber)
      if (args.parentIssueKey !== undefined) params.set('parentIssueKey', args.parentIssueKey)
      const qs = params.toString() ? '?' + params.toString() : ''
      return (await apiCall('GET', `/projects/${args.projectKey}/issues${qs}`)).body
    }

    case 'kose_get_issue':
      return (await apiCall('GET', `/projects/${args.projectKey}/issues/${args.issueKey}`)).body

    case 'kose_create_issue': {
      const { projectKey, ...body } = args
      return (await apiCall('POST', `/projects/${projectKey}/issues`, body)).body
    }

    case 'kose_update_issue': {
      const { projectKey, issueKey, ...body } = args
      return (await apiCall('PATCH', `/projects/${projectKey}/issues/${issueKey}`, body)).body
    }

    case 'kose_delete_issue':
      return (await apiCall('DELETE', `/projects/${args.projectKey}/issues/${args.issueKey}`)).body

    case 'kose_move_issue':
      return (await apiCall('PATCH', `/projects/${args.projectKey}/issues/${args.issueKey}/parent`, { parentIssueKey: args.parentIssueKey })).body

    case 'kose_list_versions':
      return (await apiCall('GET', `/projects/${args.projectKey}/versions`)).body

    case 'kose_get_version':
      return (await apiCall('GET', `/projects/${args.projectKey}/versions/${args.versionNumber}`)).body

    case 'kose_create_version': {
      const { projectKey, ...body } = args
      return (await apiCall('POST', `/projects/${projectKey}/versions`, body)).body
    }

    case 'kose_update_version': {
      const { projectKey, versionNumber, ...body } = args
      return (await apiCall('PATCH', `/projects/${projectKey}/versions/${versionNumber}`, body)).body
    }

    case 'kose_delete_version':
      return (await apiCall('DELETE', `/projects/${args.projectKey}/versions/${args.versionNumber}`)).body

    default:
      throw new Error(`Unknown tool: ${name}`)
  }
}

async function main() {
  const server = new Server(
    { name: 'kose', version: '1.0.0' },
    { capabilities: { tools: {} } }
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }))

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params
    try {
      const result = await handleTool(name, args || {})
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
    } catch (err) {
      return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true }
    }
  })

  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch(console.error)
