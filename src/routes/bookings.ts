import { FastifyInstance } from 'fastify';
import { pool } from '../db.js';

type ReserveBody = {
  event_id: number;
  user_id: string;
};

const reserveSchema = {
  body: {
    type: 'object',
    required: ['event_id', 'user_id'],
    properties: {
      event_id: { type: 'integer', minimum: 1 },
      user_id: { type: 'string', minLength: 1 },
    },
    additionalProperties: false,
  },
  response: {
    201: {
      type: 'object',
      properties: {
        booking: {
          type: 'object',
          required: ['id', 'event_id', 'user_id', 'created_at'],
          properties: {
            id: { type: 'number' },
            event_id: { type: 'number' },
            user_id: { type: 'string' },
            created_at: { type: 'string' },
          },
        },
        event: {
          type: 'object',
          required: ['id', 'name', 'total_seats', 'remaining_seats'],
          properties: {
            id: { type: 'number' },
            name: { type: 'string' },
            total_seats: { type: 'number' },
            remaining_seats: { type: 'number' },
          },
        },
      },
    },
    400: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
    404: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
    409: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  },
};

const bookingsRoutes = async (fastify: FastifyInstance) => {
  fastify.post<{ Body: ReserveBody }>('/reserve', { schema: reserveSchema }, async (request, reply) => {
    const { event_id, user_id } = request.body;

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const eventStatsResult = await client.query<{
        event_id: number;
        name: string;
        total_seats: number;
        total_bookings: number;
        user_bookings: number;
      }>(
        `
          WITH locked_event AS (
            SELECT id, name, total_seats
            FROM events
            WHERE id = $1
            FOR UPDATE
          ),
          booking_stats AS (
            SELECT
              COUNT(*)::int AS total_bookings,
              COUNT(*) FILTER (WHERE user_id = $2)::int AS user_bookings
            FROM bookings
            WHERE event_id = $1
          )
          SELECT
            locked_event.id AS event_id,
            locked_event.name,
            locked_event.total_seats,
            booking_stats.total_bookings,
            booking_stats.user_bookings
          FROM locked_event
          CROSS JOIN booking_stats
        `,
        [event_id, user_id],
      );

      if (eventStatsResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return reply.status(404).send({ message: 'Event not found' });
      }

      const eventStats = eventStatsResult.rows[0];

      if (eventStats.user_bookings > 0) {
        await client.query('ROLLBACK');
        return reply.status(409).send({ message: 'User already booked this event' });
      }

      if (eventStats.total_bookings >= eventStats.total_seats) {
        await client.query('ROLLBACK');
        return reply.status(409).send({ message: 'No seats available for this event' });
      }

      const insertResult = await client.query<{
        id: number;
        event_id: number;
        user_id: string;
        created_at: Date;
      }>(
        `INSERT INTO bookings (event_id, user_id)
         VALUES ($1, $2)
         RETURNING id, event_id, user_id, created_at`,
        [event_id, user_id],
      );

      await client.query('COMMIT');
      const booking = insertResult.rows[0];
      const remainingSeats = Math.max(eventStats.total_seats - (eventStats.total_bookings + 1), 0);

      return reply.status(201).send({
        booking: {
          ...booking,
          created_at: booking.created_at.toISOString(),
        },
        event: {
          id: eventStats.event_id,
          name: eventStats.name,
          total_seats: eventStats.total_seats,
          remaining_seats: remainingSeats,
        },
      });
    } catch (error) {
      await client.query('ROLLBACK');
      fastify.log.error(error);
      return reply.status(500).send({ message: 'Internal server error' });
    } finally {
      client.release();
    }
  });
};

export default bookingsRoutes;

