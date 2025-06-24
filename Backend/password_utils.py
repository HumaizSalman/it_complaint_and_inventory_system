"""
Password utility functions for generating secure temporary passwords.
"""

import secrets
import string
from typing import Optional

def generate_secure_password(
    length: int = 12,
    include_uppercase: bool = True,
    include_lowercase: bool = True,
    include_digits: bool = True,
    include_symbols: bool = True,
    exclude_ambiguous: bool = True
) -> str:
    """
    Generate a cryptographically secure random password.
    
    Args:
        length: Length of the password (minimum 8, maximum 128)
        include_uppercase: Include uppercase letters (A-Z)
        include_lowercase: Include lowercase letters (a-z)
        include_digits: Include digits (0-9)
        include_symbols: Include symbols (!@#$%^&*)
        exclude_ambiguous: Exclude ambiguous characters (0, O, l, 1, I)
        
    Returns:
        str: Generated secure password
    """
    # Validate length
    length = max(8, min(128, length))
    
    # Define character sets
    uppercase = string.ascii_uppercase
    lowercase = string.ascii_lowercase
    digits = string.digits
    symbols = "!@#$%^&*"
    
    # Remove ambiguous characters if requested
    if exclude_ambiguous:
        uppercase = uppercase.replace('O', '').replace('I', '')
        lowercase = lowercase.replace('l', '')
        digits = digits.replace('0', '').replace('1', '')
    
    # Build character pool
    char_pool = ""
    required_chars = []
    
    if include_uppercase:
        char_pool += uppercase
        required_chars.append(secrets.choice(uppercase))
    
    if include_lowercase:
        char_pool += lowercase
        required_chars.append(secrets.choice(lowercase))
    
    if include_digits:
        char_pool += digits
        required_chars.append(secrets.choice(digits))
    
    if include_symbols:
        char_pool += symbols
        required_chars.append(secrets.choice(symbols))
    
    if not char_pool:
        raise ValueError("At least one character type must be included")
    
    # Generate password
    password_chars = required_chars.copy()
    
    # Fill remaining length with random characters
    for _ in range(length - len(required_chars)):
        password_chars.append(secrets.choice(char_pool))
    
    # Shuffle the password characters
    secrets.SystemRandom().shuffle(password_chars)
    
    return ''.join(password_chars)

def generate_employee_password() -> str:
    """Generate a secure password for employee accounts."""
    return generate_secure_password(
        length=12,
        include_uppercase=True,
        include_lowercase=True,
        include_digits=True,
        include_symbols=True,
        exclude_ambiguous=True
    )

def generate_vendor_password() -> str:
    """Generate a secure password for vendor accounts."""
    return generate_secure_password(
        length=12,
        include_uppercase=True,
        include_lowercase=True,
        include_digits=True,
        include_symbols=True,
        exclude_ambiguous=True
    )

def generate_simple_password() -> str:
    """Generate a simpler password for easier manual entry (no symbols)."""
    return generate_secure_password(
        length=10,
        include_uppercase=True,
        include_lowercase=True,
        include_digits=True,
        include_symbols=False,
        exclude_ambiguous=True
    )

def validate_password_strength(password: str) -> dict:
    """
    Validate password strength.
    
    Args:
        password: Password to validate
        
    Returns:
        dict: Validation results with score and feedback
    """
    score = 0
    feedback = []
    
    # Length check
    if len(password) >= 8:
        score += 2
    elif len(password) >= 6:
        score += 1
        feedback.append("Password should be at least 8 characters long")
    else:
        feedback.append("Password is too short (minimum 6 characters)")
    
    # Character type checks
    has_upper = any(c.isupper() for c in password)
    has_lower = any(c.islower() for c in password)
    has_digit = any(c.isdigit() for c in password)
    has_symbol = any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password)
    
    if has_upper:
        score += 1
    else:
        feedback.append("Add uppercase letters")
    
    if has_lower:
        score += 1
    else:
        feedback.append("Add lowercase letters")
    
    if has_digit:
        score += 1
    else:
        feedback.append("Add numbers")
    
    if has_symbol:
        score += 1
    else:
        feedback.append("Add special characters")
    
    # Repetition check
    if len(set(password)) < len(password) * 0.7:
        feedback.append("Reduce character repetition")
    else:
        score += 1
    
    # Determine strength level
    if score >= 7:
        strength = "Very Strong"
    elif score >= 5:
        strength = "Strong"
    elif score >= 3:
        strength = "Moderate"
    elif score >= 1:
        strength = "Weak"
    else:
        strength = "Very Weak"
    
    return {
        "score": score,
        "max_score": 7,
        "strength": strength,
        "feedback": feedback,
        "is_acceptable": score >= 3
    } 