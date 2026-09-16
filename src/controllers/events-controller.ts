import { NextFunction, Request, Response } from 'express';
import { Event, Registration } from '../models';
import { createServerError, pick } from '../utils'

export const errors = {
  EVENT_NOT_FOUND: {
    errorCode: 404,
    code: 'EVENT_NOT_FOUND',
    message: 'Event was not found'
  }
};

export function presentEvent(event: Event, peopleAlreadyIn: number) {
  const value = event.get({ plain: true }) as any;

  return {
    ...pick(value, ['id', 'title', 'capacity', 'status', 'createdAt']),
    registeredCount: peopleAlreadyIn,
    freePlaces: Math.max(value.capacity - peopleAlreadyIn, 0),
  };
}


export async function listEvents(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const allEvents = await Event.findAll({ order: [['title', 'ASC']] });

    const result = await Promise.all(
      allEvents.map(async (event) => {
        const peopleAlreadyIn = await Registration.count({
          where: { eventId: event.id },
        });

        return presentEvent(event, peopleAlreadyIn);
      })
    );
    res.json({ events: result });
  } catch (error) {
    next(error);
  }
}

export async function getEvent(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const eventId = req.params.eventId as string;
    const event = await Event.findByPk(eventId);

    if (!event) {
      return createServerError(res, errors.EVENT_NOT_FOUND)
    }

    const registeredCount = await Registration.count({
      where: { eventId: event.id },
    });

    res.json({
      event: presentEvent(event, registeredCount)
    });
  } catch (error) {
    next(error);
  }
}
