import { cronJobs } from 'convex/server'

import { internal } from './_generated/api'

const crons = cronJobs()

crons.interval('purge expired rooms', { hours: 24 }, internal.rooms.purgeExpired, {})

export default crons
