const { Resend } = require('resend')

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = {
  noreply: `${process.env.RESEND_NAME_APP} <${process.env.RESEND_EMAIL_NOREPLY}>`,
  hola: `${process.env.RESEND_NAME_MARKETING} <${process.env.RESEND_EMAIL_HOLA}>`,
  feedback: `${process.env.RESEND_NAME_APP} <${process.env.RESEND_EMAIL_FEEDBACK}>`,
}

/**
 * Función genérica para enviar correos vía Resend.
 * @param {Object} options
 * @param {string|string[]} options.to - Destinatario(s)
 * @param {string} options.subject - Asunto del correo
 * @param {string} options.html - Contenido en formato HTML
 */
const sendEmail = async ({ to, subject, html }) => {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('RESEND_API_KEY no configurada. Saltando envío de correo.')
      return { success: false, error: 'API Key missing' }
    }

    const { data, error } = await resend.emails.send({
      from: `Saldai <${fromEmail}>`,
      to,
      subject,
      html,
    })

    if (error) {
      console.error('Error enviando correo de Resend:', error)
      return { success: false, error }
    }

    return { success: true, data }
  } catch (err) {
    console.error('Excepción al enviar correo:', err)
    return { success: false, error: err.message }
  }
}

module.exports = {
  sendEmail,
}
