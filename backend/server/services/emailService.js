import nodemailer from 'nodemailer';
import { config } from '../config/index.js';

class EmailService {
    constructor() {
        this.transporter = null;
    }

    isConfigured() {
        return Boolean(config.email.smtpHost && config.email.smtpUser && config.email.smtpPass);
    }

    getTransporter() {
        if (!this.isConfigured()) {
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
                }
            });
        }

        return this.transporter;
    }

    formatDate(dateValue) {
        return new Intl.DateTimeFormat('fr-FR', {
            dateStyle: 'full',
            timeStyle: 'short',
            timeZone: 'Africa/Algiers'
        }).format(new Date(dateValue));
    }

    buildSeminarDetails(row) {
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

    async sendSeminarApprovalEmail(row) {
        const transporter = this.getTransporter();

        if (!transporter) {
            return {
                sent: false,
                skipped: true,
                reason: 'SMTP non configuré'
            };
        }

        const message = this.buildApprovalEmail(row);
        await transporter.sendMail({
            from: config.email.from,
            replyTo: config.email.replyTo || undefined,
            ...message
        });

        return { sent: true, skipped: false };
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
