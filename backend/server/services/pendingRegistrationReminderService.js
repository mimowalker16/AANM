import { config } from '../config/index.js';
import database from '../database/index.js';
import emailService from './emailService.js';

class PendingRegistrationReminderService {
    constructor() {
        this.timer = null;
        this.isRunning = false;
    }

    start() {
        if (!config.email.adminPendingReminderEnabled) {
            console.log('Admin pending registration reminders disabled');
            return;
        }

        if (this.timer) return;

        const intervalMs = Math.max(config.email.adminPendingReminderIntervalMinutes, 1) * 60 * 1000;
        this.timer = setInterval(() => {
            this.runOnce().catch((error) => {
                console.error('Pending registration reminder job failed:', error);
            });
        }, intervalMs);

        setTimeout(() => {
            this.runOnce().catch((error) => {
                console.error('Pending registration reminder job failed:', error);
            });
        }, 30 * 1000);

        console.log(`Admin pending registration reminders enabled every ${config.email.adminPendingReminderIntervalMinutes} minute(s)`);
    }

    stop() {
        if (!this.timer) return;
        clearInterval(this.timer);
        this.timer = null;
    }

    async runOnce() {
        if (this.isRunning) return;
        this.isRunning = true;

        try {
            const registrations = await database.claimPendingRegistrationsForAdminReminder({
                afterHours: config.email.adminPendingReminderAfterHours,
                retryMinutes: config.email.adminPendingReminderRetryMinutes,
                limit: config.email.adminPendingReminderBatchSize
            });

            if (!registrations.length) return;

            console.log(`Sending ${registrations.length} pending registration admin reminder(s)`);

            for (const registration of registrations) {
                try {
                    const result = await emailService.sendAdminPendingRegistrationReminder(registration);
                    if (result.sent) {
                        await database.markAdminPendingReminderSent(registration.id);
                    } else {
                        await database.markAdminPendingReminderError(registration.id, result.reason || 'Rappel admin non envoyé');
                    }
                } catch (error) {
                    await database.markAdminPendingReminderError(registration.id, error.message);
                    console.error('Failed to send pending registration admin reminder:', {
                        registrationId: registration.id,
                        seminarId: registration.seminar_id,
                        message: error.message
                    });
                }
            }
        } finally {
            this.isRunning = false;
        }
    }
}

export default new PendingRegistrationReminderService();
