import { describe, expect, it } from 'vitest';

import { calendarDisplayName } from './google-calendar.js';

describe('calendarDisplayName', () => {
  it('prefers a name the user set in Google (summaryOverride)', () => {
    expect(calendarDisplayName('sidhant.drushti@gmail.com', 'PDA')).toBe('PDA');
  });

  it('falls back to the summary verbatim (email for shared personal calendars)', () => {
    expect(calendarDisplayName('sidhant.drushti@gmail.com')).toBe('sidhant.drushti@gmail.com');
  });

  it('leaves real calendar names untouched', () => {
    expect(calendarDisplayName('Birthdays & Anniversaries')).toBe('Birthdays & Anniversaries');
  });
});
