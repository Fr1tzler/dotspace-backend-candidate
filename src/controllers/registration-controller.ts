import {NextFunction, Request, Response} from 'express';
import {Event, Registration, sequelize, User} from '../models';
import {createServerError, pick} from '../utils';

export const errors = {
  EVENT_NOT_FOUND: {
    errorCode: 404,
    code: 'EVENT_NOT_FOUND',
    message: 'Event was not found'
  },
  USER_NOT_FOUND: {
    errorCode: 404,
    code: 'USER_NOT_FOUND',
    message: 'User was not found'
  },
  EVENT_FULL: {
    errorCode: 409,
    code: 'EVENT_FULL',
    message: 'There are no free places'
  }
};

function registrationJson(registration: Registration) {
  return pick(registration, ['id', 'userId', 'eventId', 'createdAt' ]);
}

export async function registerForEvent(
  req: Request<{ eventId: string }, { userId: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const transaction = await sequelize.transaction();

  try {
    const {eventId} = req.params;
    const { userId } = req.body;

    const user = await User.findByPk(userId, { transaction });
    if (!user) {
      await transaction.rollback();
      return createServerError(res, errors.USER_NOT_FOUND);
    }

    const event = await Event.findByPk(eventId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!event) {
      await transaction.rollback();
      return createServerError(res, errors.EVENT_NOT_FOUND);
    }

    const registrationsNow = await Registration.count({ where: { eventId }, transaction });
    if (registrationsNow >= event.capacity) {
      await transaction.rollback();
      return createServerError(res, errors.EVENT_FULL);
    }

    const sameRegistration = await Registration.findOne({
      where: { eventId, userId: user.id },
      transaction,
    },);

    if (sameRegistration) {
      await transaction.commit();
      res.status(200).json({ registration: registrationJson(sameRegistration) });
      return;
    }

    const created = await Registration.create({ eventId, userId: user.id }, { transaction });

    res.status(201).json({ registration: registrationJson(created) });
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    next(error);
  }
}
