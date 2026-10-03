import { buildMessage, ValidateBy, ValidationOptions } from 'class-validator';
import { isValidDateKey, isValidTimeOfDay, isValidTimeZone } from './utils/date.util.js';

/** "HH:mm", 24-hour */
export function IsTimeOfDay(options?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'isTimeOfDay',
      validator: {
        validate: (value) => typeof value === 'string' && isValidTimeOfDay(value),
        defaultMessage: buildMessage((each) => `${each}$property must be a time in HH:mm format`, options),
      },
    },
    options,
  );
}

/** "YYYY-MM-DD" calendar date */
export function IsDateKey(options?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'isDateKey',
      validator: {
        validate: (value) => typeof value === 'string' && isValidDateKey(value),
        defaultMessage: buildMessage((each) => `${each}$property must be a date in YYYY-MM-DD format`, options),
      },
    },
    options,
  );
}

/** IANA timezone, e.g. "Asia/Kolkata" */
export function IsTimeZone(options?: ValidationOptions) {
  return ValidateBy(
    {
      name: 'isTimeZone',
      validator: {
        validate: (value) => typeof value === 'string' && isValidTimeZone(value),
        defaultMessage: buildMessage((each) => `${each}$property must be a valid IANA timezone`, options),
      },
    },
    options,
  );
}

/** Reasonable maximum lengths for free text (spec §35). */
export const MAX_NAME = 120;
export const MAX_TEXT = 2000;
