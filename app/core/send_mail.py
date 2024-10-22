from datetime import datetime, timedelta
import random
import string
from app.core.security import get_password_hash
from app.core.config import settings
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

password_reset_tokens = {}


def generate_password():
    """Generates a random password."""
    characters = string.ascii_letters + string.digits + string.punctuation
    return ''.join(random.choice(characters) for i in range(12))


async def send_email(email_to: str, subject: str, html_content: str):
    smtp_server = "pathos.tanatos.org"
    smtp_port = 587
    sender_email = "mailtest@tanatos.org"
    password = "mailtest99"

    message = MIMEMultipart()
    message["From"] = sender_email
    message["To"] = email_to
    message["Subject"] = subject

    message.attach(MIMEText(html_content, "html"))

    try:
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()  # Включаем шифрование
        server.login(sender_email, password)  # Авторизуемся
        server.send_message(message)
        print(f"Email successfully sent to {email_to}")
    except Exception as e:
        print(f"Error sending email: {e}")
    finally:
        server.quit()


async def send_reset_password_email(email: str, new_password: str):
    html_content = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #4A90E2;">Password Reset</h2>
            <p>Dear user,</p>
            <p>Your password has been successfully reset. Your new password is:</p>
            <p style="background-color: #F0F0F0; padding: 10px; font-family: monospace; font-size: 16px;">{new_password}</p>
            <p>We recommend changing this password after logging into the system.</p>
            <p>If you did not request a password reset, please contact our support team immediately.</p>
            <p>Best regards,<br>Support Team</p>
        </body>
    </html>
    """
    
    await send_email(
        email_to=email,
        subject="New password for your account",
        html_content=html_content
    )


def verify_reset_token(email: str, token: int) -> bool:
    """
    Проверяет токен восстановления пароля для указанного email.
    
    :param email: Email пользователя
    :param token: Токен для проверки
    :return: True, если токен верный, иначе False
    """
    stored_token = password_reset_tokens.get(email)
    if stored_token and stored_token == token:
        # Удаляем использованный токен
        del password_reset_tokens[email]
        return True
    return False
