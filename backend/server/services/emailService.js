import nodemailer from 'nodemailer';
import { config } from '../config/index.js';

class EmailService {
    constructor() {
        this.transporter = null;
    }

    isConfigured() {
        if (this.resolveProvider() === 'resend') {
            return this.isResendConfigured();
        }

        if (this.resolveProvider() === 'smtp') {
            return this.isSmtpConfigured();
        }

        return this.isResendConfigured() || this.isSmtpConfigured();
    }

    isSmtpConfigured() {
        return Boolean(config.email.smtpHost && config.email.smtpUser && config.email.smtpPass);
    }

    isResendConfigured() {
        return Boolean(config.email.resendApiKey);
    }

    resolveProvider() {
        if (config.email.provider === 'resend' || config.email.provider === 'smtp') {
            return config.email.provider;
        }

        return this.isResendConfigured() ? 'resend' : 'smtp';
    }

    getStatus() {
        const provider = this.resolveProvider();

        return {
            provider,
            configured: this.isConfigured(),
            from: config.email.from,
            replyTo: config.email.replyTo || null,
            smtp: {
                configured: this.isSmtpConfigured(),
                host: config.email.smtpHost || null,
                port: config.email.smtpPort,
                secure: config.email.smtpSecure
            },
            resend: {
                configured: this.isResendConfigured(),
                apiUrl: config.email.resendApiUrl
            }
        };
    }

    getTransporter() {
        if (!this.isSmtpConfigured()) {
            return null;
        }

        if (!this.transporter) {
            this.transporter = nodemailer.createTransport({
                host: config.email.smtpHost,
                port: config.email.smtpPort,
                secure: config.email.smtpSecure,
                auth: {
                    user: config.email.smtpUser,
                    pass: config.email.smtpPass
                },
                // Increased timeouts for restrictive network environments
                connectionTimeout: 30000,  // 30s - for slow/restrictive networks
                greetingTimeout: 30000,    // 30s
                socketTimeout: 30000,      // 30s
                pool: {
                    maxConnections: 1,
                    maxMessages: Infinity,
                    rateDelta: 1000,
                    rateLimit: 5  // Max 5 emails per second
                }
            });
        }

        return this.transporter;
    }

    formatDate(dateValue) {
        if (!dateValue) {
            throw new Error('Date value is missing');
        }

        const date = new Date(dateValue);
        if (isNaN(date.getTime())) {
            throw new Error(`Invalid date format: ${dateValue}`);
        }

        return new Intl.DateTimeFormat('fr-FR', {
            dateStyle: 'full',
            timeStyle: 'short',
            timeZone: 'Africa/Algiers'
        }).format(date);
    }

    buildSeminarDetails(row) {
        if (!row) {
            throw new Error('Registration data is missing');
        }

        if (!row.seminar_title) {
            throw new Error('Seminar title is missing');
        }

        if (!row.seminar_date) {
            throw new Error('Seminar date is missing');
        }

        const isVirtual = row.seminar_delivery_mode === 'virtual';
        const participationLabel = isVirtual ? 'Lien de la salle virtuelle' : 'Lieu';
        const participationValue = isVirtual
            ? row.seminar_virtual_room_url || 'Le lien sera communiqué prochainement.'
            : row.seminar_location || 'Le lieu sera communiqué prochainement.';

        return {
            title: row.seminar_title,
            date: this.formatDate(row.seminar_date),
            description: row.seminar_description || '',
            participationLabel,
            participationValue,
            isVirtual
        };
    }

    buildApprovalEmail(row) {
        if (!row) {
            throw new Error('Registration data is missing');
        }

        if (!row.email) {
            throw new Error('Recipient email is missing');
        }

        const details = this.buildSeminarDetails(row);
        const greetingName = row.full_name || 'participant';
        const descriptionLine = details.description
            ? `\nDescription : ${details.description}\n`
            : '';

        const text = [
            `Bonjour ${greetingName},`,
            '',
            "Votre paiement a été vérifié et votre inscription au séminaire AANM est confirmée.",
            '',
            `Séminaire : ${details.title}`,
            `Date : ${details.date}`,
            `${details.participationLabel} : ${details.participationValue}`,
            descriptionLine.trim(),
            '',
            'Merci pour votre confiance.',
            "L'équipe AANM"
        ].filter(Boolean).join('\n');

        const htmlDescription = details.description
            ? `<p><strong>Description :</strong> ${this.escapeHtml(details.description)}</p>`
            : '';
        const participationValue = details.isVirtual && /^https?:\/\//i.test(details.participationValue)
            ? `<a href="${this.escapeAttribute(details.participationValue)}">${this.escapeHtml(details.participationValue)}</a>`
            : this.escapeHtml(details.participationValue);

        const html = `
            <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937;">
                <p>Bonjour ${this.escapeHtml(greetingName)},</p>
                <p>Votre paiement a été vérifié et votre inscription au séminaire AANM est confirmée.</p>
                <div style="border:1px solid #d8eee8;border-radius:12px;padding:16px;margin:18px 0;background:#f8fffc;">
                    <p><strong>Séminaire :</strong> ${this.escapeHtml(details.title)}</p>
                    <p><strong>Date :</strong> ${this.escapeHtml(details.date)}</p>
                    <p><strong>${this.escapeHtml(details.participationLabel)} :</strong> ${participationValue}</p>
                    ${htmlDescription}
                </div>
                <p>Merci pour votre confiance.</p>
                <p>L'équipe AANM</p>
            </div>
        `;

        return {
            to: row.email,
            subject: `Confirmation d'inscription - ${details.title}`,
            text,
            html
        };
    }

    buildSeminarUpdateEmail(row, changes = []) {
        if (!row) {
            throw new Error('Registration data is missing');
        }

        if (!row.email) {
            throw new Error('Recipient email is missing');
        }

        const details = this.buildSeminarDetails(row);
        const greetingName = row.full_name || 'participant';
        const changedItems = changes.length
            ? changes.map((change) => `- ${change}`).join('\n')
            : '- Les informations du séminaire ont été mises à jour.';
        const htmlChangedItems = changes.length
            ? changes.map((change) => `<li>${this.escapeHtml(change)}</li>`).join('')
            : '<li>Les informations du séminaire ont été mises à jour.</li>';
        const descriptionLine = details.description
            ? `\nDescription : ${details.description}\n`
            : '';
        const participationValue = details.isVirtual && /^https?:\/\//i.test(details.participationValue)
            ? `<a href="${this.escapeAttribute(details.participationValue)}">${this.escapeHtml(details.participationValue)}</a>`
            : this.escapeHtml(details.participationValue);

        const text = [
            `Bonjour ${greetingName},`,
            '',
            "Les informations de votre séminaire AANM ont été mises à jour.",
            '',
            'Changements :',
            changedItems,
            '',
            `Séminaire : ${details.title}`,
            `Date : ${details.date}`,
            `${details.participationLabel} : ${details.participationValue}`,
            descriptionLine.trim(),
            '',
            "Merci de prendre en compte ces nouvelles informations.",
            "L'équipe AANM"
        ].filter(Boolean).join('\n');

        const htmlDescription = details.description
            ? `<p><strong>Description :</strong> ${this.escapeHtml(details.description)}</p>`
            : '';
        const html = `
            <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937;">
                <p>Bonjour ${this.escapeHtml(greetingName)},</p>
                <p>Les informations de votre séminaire AANM ont été mises à jour.</p>
                <div style="border:1px solid #fde68a;border-radius:12px;padding:16px;margin:18px 0;background:#fffbeb;">
                    <p><strong>Changements :</strong></p>
                    <ul>${htmlChangedItems}</ul>
                </div>
                <div style="border:1px solid #d8eee8;border-radius:12px;padding:16px;margin:18px 0;background:#f8fffc;">
                    <p><strong>Séminaire :</strong> ${this.escapeHtml(details.title)}</p>
                    <p><strong>Date :</strong> ${this.escapeHtml(details.date)}</p>
                    <p><strong>${this.escapeHtml(details.participationLabel)} :</strong> ${participationValue}</p>
                    ${htmlDescription}
                </div>
                <p>Merci de prendre en compte ces nouvelles informations.</p>
                <p>L'équipe AANM</p>
            </div>
        `;

        return {
            to: row.email,
            subject: `Mise à jour du séminaire - ${details.title}`,
            text,
            html
        };
    }

    buildAdminPendingRegistrationReminderEmail(row) {
        if (!row) {
            throw new Error('Registration data is missing');
        }

        if (!config.email.replyTo) {
            throw new Error('Admin reply-to email is missing');
        }

        const details = this.buildSeminarDetails(row);
        const registeredAt = row.registered_at
            ? this.formatDate(row.registered_at)
            : 'Date inconnue';
        const phoneLine = row.phone ? `Téléphone : ${row.phone}` : 'Téléphone : -';

        const text = [
            'Bonjour,',
            '',
            "Une inscription est en attente d'approbation depuis plus de 5 heures.",
            '',
            `Séminaire : ${details.title}`,
            `Date du séminaire : ${details.date}`,
            `Candidat : ${row.full_name || '-'}`,
            `Email : ${row.email || '-'}`,
            phoneLine,
            `Inscrit le : ${registeredAt}`,
            '',
            "Connectez-vous au tableau de bord administrateur pour vérifier le paiement et approuver ou supprimer l'inscription.",
            '',
            "L'équipe AANM"
        ].join('\n');

        const html = `
            <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937;">
                <p>Bonjour,</p>
                <p>Une inscription est en attente d'approbation depuis plus de 5 heures.</p>
                <div style="border:1px solid #fde68a;border-radius:12px;padding:16px;margin:18px 0;background:#fffbeb;">
                    <p><strong>Séminaire :</strong> ${this.escapeHtml(details.title)}</p>
                    <p><strong>Date du séminaire :</strong> ${this.escapeHtml(details.date)}</p>
                    <p><strong>Candidat :</strong> ${this.escapeHtml(row.full_name || '-')}</p>
                    <p><strong>Email :</strong> ${this.escapeHtml(row.email || '-')}</p>
                    <p><strong>Téléphone :</strong> ${this.escapeHtml(row.phone || '-')}</p>
                    <p><strong>Inscrit le :</strong> ${this.escapeHtml(registeredAt)}</p>
                </div>
                <p>Connectez-vous au tableau de bord administrateur pour vérifier le paiement et approuver ou supprimer l'inscription.</p>
                <p>L'équipe AANM</p>
            </div>
        `;

        return {
            to: config.email.replyTo,
            subject: `Inscription en attente - ${details.title}`,
            text,
            html
        };
    }

    async sendSeminarApprovalEmail(row) {
        const provider = this.resolveProvider();

        if (!this.isConfigured()) {
            return {
                sent: false,
                skipped: true,
                reason: 'Service email non configuré'
            };
        }

        const message = this.buildApprovalEmail(row);

        if (provider === 'resend') {
            return this.sendWithResend(message);
        }

        return this.sendWithSmtp(message);
    }

    async sendSeminarUpdateEmail(row, changes = []) {
        if (!this.isConfigured()) {
            return {
                sent: false,
                skipped: true,
                reason: 'Service email non configuré'
            };
        }

        const message = this.buildSeminarUpdateEmail(row, changes);
        return this.resolveProvider() === 'resend'
            ? this.sendWithResend(message)
            : this.sendWithSmtp(message);
    }

    async sendAdminPendingRegistrationReminder(row) {
        if (!config.email.replyTo) {
            return {
                sent: false,
                skipped: true,
                reason: 'EMAIL_REPLY_TO non configuré'
            };
        }

        if (!this.isConfigured()) {
            return {
                sent: false,
                skipped: true,
                reason: 'Service email non configuré'
            };
        }

        const message = this.buildAdminPendingRegistrationReminderEmail(row);
        return this.resolveProvider() === 'resend'
            ? this.sendWithResend(message)
            : this.sendWithSmtp(message);
    }

    async sendTestEmail(to) {
        const recipient = String(to || '').trim();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
            return {
                sent: false,
                skipped: true,
                reason: 'Adresse email de test invalide',
                code: 'INVALID_TEST_EMAIL'
            };
        }

        if (!this.isConfigured()) {
            return {
                sent: false,
                skipped: true,
                reason: 'Service email non configuré',
                code: 'EMAIL_NOT_CONFIGURED'
            };
        }

        const message = {
            to: recipient,
            subject: 'Test email - AANM',
            text: "Ceci est un email de test depuis le service d'administration AANM.",
            html: `
                <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937;">
                    <p>Ceci est un email de test depuis le service d'administration AANM.</p>
                    <p>Si vous le recevez, la configuration email de production fonctionne.</p>
                </div>
            `
        };

        return this.resolveProvider() === 'resend'
            ? this.sendWithResend(message)
            : this.sendWithSmtp(message);
    }

    async sendWithSmtp(message) {
        const transporter = this.getTransporter();

        if (!transporter) {
            return {
                sent: false,
                skipped: true,
                reason: 'SMTP non configuré'
            };
        }

        try {
            await transporter.sendMail({
                from: config.email.from,
                replyTo: config.email.replyTo || undefined,
                ...message
            });
            console.log(`Email sent successfully to ${message.to}`);
        } catch (error) {
            // Reset transporter on connection errors, but not on auth errors
            // Auth errors are permanent and will just keep failing
            if (error.code !== 'EAUTH' && error.responseCode !== 535) {
                this.transporter = null;
            }
            const failure = this.describeDeliveryError(error);

            console.error('Seminar approval email failed:', {
                provider: 'smtp',
                code: error.code,
                command: error.command,
                responseCode: error.responseCode,
                response: error.response,
                message: error.message,
                smtpHost: config.email.smtpHost,
                smtpPort: config.email.smtpPort,
                smtpSecure: config.email.smtpSecure
            });

            return {
                sent: false,
                skipped: false,
                reason: failure.message,
                code: failure.code
            };
        }

        return { sent: true, skipped: false };
    }

    async sendWithResend(message) {
        if (!config.email.resendApiKey) {
            return {
                sent: false,
                skipped: true,
                reason: 'Clé API Resend manquante',
                code: 'RESEND_API_KEY_MISSING'
            };
        }

        try {
            const response = await fetch(config.email.resendApiUrl, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${config.email.resendApiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    from: config.email.from,
                    to: [message.to],
                    reply_to: config.email.replyTo || undefined,
                    subject: message.subject,
                    html: message.html,
                    text: message.text
                }),
                signal: AbortSignal.timeout(15000)
            });

            if (!response.ok) {
                const responseBody = await response.text();
                
                console.error('Resend API error response:', {
                    status: response.status,
                    statusText: response.statusText,
                    body: responseBody.slice(0, 500)
                });

                const error = new Error(`Resend API error ${response.status}`);
                error.code = 'RESEND_API_ERROR';
                error.responseCode = response.status;
                error.response = responseBody.slice(0, 500);
                throw error;
            }

            const result = await response.json();
            console.log(`Email sent successfully via Resend to ${message.to}`, { id: result.id });
            return { sent: true, skipped: false };
        } catch (error) {
            const failure = this.describeDeliveryError(error);

            console.error('Seminar approval email failed:', {
                provider: 'resend',
                code: error.code || error.name,
                responseCode: error.responseCode,
                response: error.response,
                message: error.message,
                apiUrl: config.email.resendApiUrl
            });

            return {
                sent: false,
                skipped: false,
                reason: failure.message,
                code: failure.code
            };
        }
    }

    describeDeliveryError(error) {
        const code = error?.code || error?.command || error?.name || 'EMAIL_DELIVERY_FAILED';

        if (error?.code === 'RESEND_API_KEY_MISSING') {
            return {
                code,
                message: "Inscription approuvée, mais l'email n'a pas pu être envoyé : clé API Resend manquante."
            };
        }

        if (error?.code === 'RESEND_API_ERROR') {
            if (error?.responseCode === 401 || error?.responseCode === 403) {
                return {
                    code,
                    message: "Inscription approuvée, mais l'email n'a pas pu être envoyé : clé API Resend invalide ou expirée."
                };
            }
            if (error?.responseCode === 422) {
                return {
                    code,
                    message: "Inscription approuvée, mais l'email n'a pas pu être envoyé : adresse email invalide pour Resend."
                };
            }
            if (error?.responseCode === 429) {
                return {
                    code,
                    message: "Inscription approuvée, mais l'email n'a pas pu être envoyé : limite de débit Resend dépassée."
                };
            }
            return {
                code,
                message: `Inscription approuvée, mais l'email n'a pas pu être envoyé : erreur Resend ${error.responseCode}.`
            };
        }

        if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
            return {
                code,
                message: "Inscription approuvée, mais l'email n'a pas pu être envoyé : le fournisseur email n'a pas répondu à temps."
            };
        }

        if (error?.code === 'ECONNRESET' || error?.code === 'ESOCKET') {
            return {
                code,
                message: "Inscription approuvée, mais l'email n'a pas pu être envoyé : la connexion SMTP a été interrompue. Vérifiez SMTP_HOST, SMTP_PORT et SMTP_SECURE."
            };
        }

        if (error?.code === 'ETIMEDOUT' || error?.code === 'ECONNECTION') {
            return {
                code,
                message: "Inscription approuvée, mais l'email n'a pas pu être envoyé : le serveur SMTP est inaccessible ou trop lent."
            };
        }

        if (error?.code === 'EAUTH' || error?.responseCode === 535) {
            return {
                code,
                message: "Inscription approuvée, mais l'email n'a pas pu être envoyé : identifiants SMTP refusés."
            };
        }

        if (error?.responseCode) {
            return {
                code,
                message: `Inscription approuvée, mais l'email n'a pas pu être envoyé : erreur SMTP ${error.responseCode}.`
            };
        }

        return {
            code,
            message: "Inscription approuvée, mais l'email n'a pas pu être envoyé. Vérifiez la configuration email."
        };
    }

    escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    escapeAttribute(value) {
        return this.escapeHtml(value).replace(/`/g, '&#096;');
    }
}

export default new EmailService();
