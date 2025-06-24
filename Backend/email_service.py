"""
Email service for sending credentials and notifications.
Supports multiple email providers including Gmail, Outlook, and custom SMTP servers.
"""

import os
import asyncio
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Dict, Any
from jinja2 import Template
import aiosmtplib
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EmailService:
    """Email service class for sending credentials and notifications."""
    
    def __init__(self):
        """Initialize email service with environment variables."""
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.smtp_username = os.getenv("SMTP_USERNAME", "")
        self.smtp_password = os.getenv("SMTP_PASSWORD", "")
        self.sender_email = os.getenv("SENDER_EMAIL", self.smtp_username)
        self.sender_name = os.getenv("SENDER_NAME", "IT Inventory System")
        self.login_url = os.getenv("LOGIN_URL", "http://localhost:3000/login")
        
        # Validate configuration
        if not all([self.smtp_server, self.smtp_username, self.smtp_password]):
            logger.warning("Email configuration incomplete. Email sending will be disabled.")
            self.enabled = False
        else:
            self.enabled = True
            logger.info(f"Email service initialized with SMTP server: {self.smtp_server}")

    def generate_credentials_email_html(self, user_type: str, user_data: Dict[str, Any]) -> str:
        """Generate HTML email content for credential notification."""
        
        template_html = """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Your Login Credentials - IT Inventory System</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
                .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
                .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; border: 1px solid #e0e0e0; border-top: none; }
                .credential-box { background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #667eea; }
                .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 6px; margin: 20px 0; color: #856404; }
                .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
                .subtitle { font-size: 16px; opacity: 0.9; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">🏢 IT Inventory System</div>
                    <div class="subtitle">Welcome to Your Account</div>
                </div>
                
                <div class="content">
                    <h2>Hello {{ name }},</h2>
                    
                    <p>Welcome! Your {{ user_type }} account has been successfully created in our IT Inventory Management System. Below are your login credentials:</p>
                    
                    <div class="credential-box">
                        <h3>📧 Your Login Credentials</h3>
                        <p><strong>Email:</strong> {{ email }}</p>
                        <p><strong>Temporary Password:</strong> <code style="background: #e9ecef; padding: 4px 8px; border-radius: 4px; font-family: monospace;">{{ password }}</code></p>
                        <p><strong>Login URL:</strong> <a href="{{ login_url }}" style="color: #667eea;">{{ login_url }}</a></p>
                    </div>
                    
                    <div class="warning">
                        <strong>⚠️ Important Security Notice:</strong><br>
                        This is a temporary password. For security reasons, please change your password immediately after your first login.
                    </div>
                    
                    <h3>📋 Next Steps:</h3>
                    <ol>
                        <li>Click the login button below or visit the login URL</li>
                        <li>Enter your email and temporary password</li>
                        <li>Change your password to something secure</li>
                        <li>Complete your profile setup</li>
                    </ol>
                    
                    <center>
                        <a href="{{ login_url }}" class="button">🚀 Login to Your Account</a>
                    </center>
                    
                    {% if user_type == "vendor" %}
                    <h3>💼 Vendor Portal Features:</h3>
                    <ul>
                        <li>View and respond to quote requests</li>
                        <li>Submit competitive quotes</li>
                        <li>Track your quote history</li>
                        <li>Update your company information</li>
                    </ul>
                    {% endif %}
                    
                    {% if user_type == "employee" %}
                    <h3>👤 Employee Portal Features:</h3>
                    <ul>
                        <li>View your assigned assets</li>
                        <li>Submit IT support requests</li>
                        <li>Track complaint status</li>
                        <li>Update your profile</li>
                    </ul>
                    {% endif %}
                    
                    <p>If you have any questions or need assistance, please don't hesitate to contact our IT support team.</p>
                    
                    <p>Best regards,<br>
                    <strong>IT Inventory Management Team</strong></p>
                </div>
                
                <div class="footer">
                    <p style="margin: 0; color: #6c757d; font-size: 14px;">
                        This is an automated message. Please do not reply to this email.<br>
                        © {{ current_year }} IT Inventory Management System. All rights reserved.
                    </p>
                </div>
            </div>
        </body>
        </html>
        """
        
        template = Template(template_html)
        from datetime import datetime
        
        return template.render(
            name=user_data.get("name", "User"),
            email=user_data.get("email", ""),
            password=user_data.get("temp_password", ""),
            user_type=user_type.title(),
            login_url=self.login_url,
            current_year=datetime.now().year
        )

    def generate_credentials_email_text(self, user_type: str, user_data: Dict[str, Any]) -> str:
        """Generate plain text email content for credential notification."""
        
        template_text = """
IT Inventory System - Login Credentials

Hello {{ name }},

Welcome! Your {{ user_type }} account has been successfully created in our IT Inventory Management System.

LOGIN CREDENTIALS:
==================
Email: {{ email }}
Temporary Password: {{ password }}
Login URL: {{ login_url }}

IMPORTANT SECURITY NOTICE:
This is a temporary password. For security reasons, please change your password immediately after your first login.

NEXT STEPS:
1. Visit: {{ login_url }}
2. Enter your email and temporary password
3. Change your password to something secure
4. Complete your profile setup

{% if user_type == "vendor" %}
VENDOR PORTAL FEATURES:
- View and respond to quote requests
- Submit competitive quotes
- Track your quote history
- Update your company information
{% endif %}

{% if user_type == "employee" %}
EMPLOYEE PORTAL FEATURES:
- View your assigned assets
- Submit IT support requests
- Track complaint status
- Update your profile
{% endif %}

If you have any questions or need assistance, please contact our IT support team.

Best regards,
IT Inventory Management Team

---
This is an automated message. Please do not reply to this email.
© {{ current_year }} IT Inventory Management System. All rights reserved.
        """
        
        template = Template(template_text)
        from datetime import datetime
        
        return template.render(
            name=user_data.get("name", "User"),
            email=user_data.get("email", ""),
            password=user_data.get("temp_password", ""),
            user_type=user_type.title(),
            login_url=self.login_url,
            current_year=datetime.now().year
        )

    async def send_credentials_email(self, user_type: str, user_data: Dict[str, Any]) -> bool:
        """
        Send credentials email to new user.
        
        Args:
            user_type: Type of user ('employee' or 'vendor')
            user_data: Dictionary containing user information (name, email, temp_password)
            
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        if not self.enabled:
            logger.warning("Email service disabled. Cannot send credentials email.")
            return False
            
        try:
            # Create message
            message = MIMEMultipart("alternative")
            message["Subject"] = f"Your {user_type.title()} Account Credentials - IT Inventory System"
            message["From"] = f"{self.sender_name} <{self.sender_email}>"
            message["To"] = user_data.get("email", "")
            
            # Create HTML and text versions
            text_content = self.generate_credentials_email_text(user_type, user_data)
            html_content = self.generate_credentials_email_html(user_type, user_data)
            
            # Attach parts
            text_part = MIMEText(text_content, "plain")
            html_part = MIMEText(html_content, "html")
            
            message.attach(text_part)
            message.attach(html_part)
            
            # Send email using aiosmtplib for async operation
            await aiosmtplib.send(
                message,
                hostname=self.smtp_server,
                port=self.smtp_port,
                start_tls=True,
                username=self.smtp_username,
                password=self.smtp_password,
            )
            
            logger.info(f"Credentials email sent successfully to {user_data.get('email', 'Unknown')}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send credentials email to {user_data.get('email', 'Unknown')}: {str(e)}")
            return False

    def test_email_configuration(self) -> Dict[str, Any]:
        """
        Test email configuration without sending an actual email.
        
        Returns:
            dict: Configuration status and any issues found
        """
        issues = []
        
        if not self.smtp_server:
            issues.append("SMTP_SERVER not configured")
        if not self.smtp_username:
            issues.append("SMTP_USERNAME not configured")
        if not self.smtp_password:
            issues.append("SMTP_PASSWORD not configured")
        if not self.sender_email:
            issues.append("SENDER_EMAIL not configured")
            
        return {
            "configured": len(issues) == 0,
            "enabled": self.enabled,
            "smtp_server": self.smtp_server,
            "smtp_port": self.smtp_port,
            "sender_email": self.sender_email,
            "sender_name": self.sender_name,
            "login_url": self.login_url,
            "issues": issues
        }

# Global email service instance
email_service = EmailService()

# Utility functions for easy import
async def send_employee_credentials(employee_data: Dict[str, Any]) -> bool:
    """Send credentials email to a new employee."""
    return await email_service.send_credentials_email("employee", employee_data)

async def send_vendor_credentials(vendor_data: Dict[str, Any]) -> bool:
    """Send credentials email to a new vendor."""
    return await email_service.send_credentials_email("vendor", vendor_data)

def get_email_configuration_status() -> Dict[str, Any]:
    """Get email service configuration status."""
    return email_service.test_email_configuration() 