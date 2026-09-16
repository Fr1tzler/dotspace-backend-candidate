import { Response } from 'express';

export type ServerError = {
    errorCode: number;
    code: string;
    message: string;
}

export const createServerError = (res: Response, error: ServerError) => {
    const { errorCode, code, message } = error

    res.status(errorCode).json({
        error: {
            code,
            message,
        }
    })
}
