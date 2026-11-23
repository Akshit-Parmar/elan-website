# Connect the Élan interview calendar

This connection is not active until the calendar owner completes setup. It reads Calendar and imports matching interview bookings into Élan. It never creates, edits or cancels Google events.

1. Sign in to **the.elan.summit@gmail.com** at Google Calendar. Open Settings → the calendar receiving interview bookings → Integrate calendar. Copy its Calendar ID. Check an actual interview event's title; note its exact common beginning. Do not use a broad prefix shared with unrelated events.
2. In Élan Admin → OC applications → Interview Calendar connection, enter that ID and title prefix. Choose the leadership members who attend every slot in this booking schedule. Click **Prepare Calendar connection**. Copy the three Script Properties displayed there. Saving again rotates the key and stops the old connection until you replace it.
3. In the same Google account, open https://script.google.com/home/start and create a project named Élan interview sync. Replace Code.gs with the supplied Code.gs file.
4. Open Project Settings and enable **Show appsscript.json manifest file in editor**. Replace the manifest with the supplied appsscript.json. The manifest enables the advanced Calendar service. If Google asks to enable the API for a custom Cloud project, enable the Google Calendar API in that project.
5. In Project Settings → Script Properties add ELAN_CALENDAR, ELAN_TITLE and ELAN_TOKEN separately, exactly as shown in Élan. Keep the token private. Do not put it in GitHub, public code or screenshots.
6. Select **setupElanCalendar** in the editor and click Run. Review and authorise Calendar read access, external requests and the scheduled trigger. No deployment as a public web app is needed.
7. Check Apps Script Executions for success and refresh Élan's Calendar connection section. It should show a recent contact time. A trigger polls approximately every five minutes; large calendars may take several runs to finish initial pagination.

## Verify before relying on it
Use a clearly labelled test OC application at Interview stage and book using that application's exact email. Verify the time, duration, joining link, interviewers and confirmation in Élan. Then reschedule and cancel the same Google booking and verify each update. Do not test with an applicant's real email without their agreement. This release does not create a test booking or send a bulk update.

Matching needs exactly one Interview-stage application whose email appears as an attendee. A typed name, an email in a description, an all-day event, a recurring event or an event without a joining link/location is not enough. Google booking events must include the applicant as an attendee. Calendar is the source of the booked time; Élan remains the source of recruitment decisions.

## Exceptions and manual changes
Ambiguous matches, duplicate bookings, overlaps and application edits after the last import appear under **Needs review**. They are not silently overwritten. Correct the source record, then run **retryElanCalendar** to recheck events. If the application was manually edited after sync, continue managing that booking manually; the guard deliberately remains in place. A new booking can only be imported once the earlier active booking is cancelled. Already published manual interviews are not automatically taken over by Calendar sync.

Applicant reschedule requests in Élan do not edit Calendar. Coordinate changes using the original Google booking. Cancellation clears the recorded slot but keeps the application at Interview; it does not reject the applicant. Known events leaving Interview stage are ignored.

## Emails and privacy
A new imported slot is treated as confirmed because the applicant chose it. Élan queues its normal booking/update email; it does not ask them to confirm again. The one-hour reminder still applies. Unconfirmed manual invitations retain their existing confirmation/reminder flow. Repeated imports and changes to unrelated event metadata do not generate another interview update.

Google grants the script Calendar read access. Only matching titles and cancelled event identifiers are sent to Élan, with the fields needed to match and record interviews. No Calendar descriptions or unrelated event content are sent. Use a dedicated interview calendar where possible. The connection token cannot read applications; it can submit events only to the configured calendar bridge.

To stop, use **Disconnect Calendar sync** in Élan, then run **stopElanCalendar** in Apps Script. Existing applications and recorded interviews remain. Remove the Script Properties and Google's authorisation if retiring the integration.
