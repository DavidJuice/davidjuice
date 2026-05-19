const { google } = require('googleapis');
const logger = require('../utils/logger');

function getCalendarClient() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });
  return google.calendar({ version: 'v3', auth });
}

async function createAppointment({ clientName, phoneNumber, language, confirmedDateTime }) {
  const calendar = getCalendarClient();
  const startTime = new Date(confirmedDateTime);
  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // +1 hour

  const langLabel = language === 'ko' ? 'Korean' : 'English';

  const event = {
    summary: `[Ace Insurance] 상담 예약 - ${clientName}`,
    description: [
      `Client: ${clientName}`,
      `Phone: ${phoneNumber}`,
      `Language: ${langLabel}`,
      `Booked via: Voice AI`,
    ].join('\n'),
    start: {
      dateTime: startTime.toISOString(),
      timeZone: 'America/Los_Angeles',
    },
    end: {
      dateTime: endTime.toISOString(),
      timeZone: 'America/Los_Angeles',
    },
  };

  const result = await calendar.events.insert({
    calendarId: process.env.GOOGLE_CALENDAR_ID,
    resource: event,
  });

  logger.info('Google Calendar event created', {
    eventId: result.data.id,
    clientName,
    phoneNumber,
    start: startTime.toISOString(),
  });

  return result.data;
}

module.exports = { createAppointment };
