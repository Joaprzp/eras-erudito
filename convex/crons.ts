import { cronJobs } from 'convex/server'

import { internal } from './_generated/api'

const crons = cronJobs()

crons.interval('purge expired rooms', { minutes: 15 }, internal.rooms.purgeExpired)

export default crons
